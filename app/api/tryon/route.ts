import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { requireAuth } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Verify FAL API key is configured
    if (!process.env.FAL_KEY) {
      console.error("FAL_KEY is not configured in environment variables");
      return NextResponse.json(
        { error: "FAL AI service is not configured. Please contact support." },
        { status: 500 }
      );
    }

    // Require authentication
    const user = await requireAuth();

    if (!user.store_id) {
      return NextResponse.json(
        { error: "User is not associated with any store" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { full_body_image, clothing_image, gender = "female" } = body;

    if (!full_body_image || !clothing_image) {
      return NextResponse.json(
        { error: "Both full_body_image and clothing_image are required" },
        { status: 400 }
      );
    }

    // Validate image URLs
    try {
      new URL(full_body_image);
      new URL(clothing_image);
    } catch (urlError) {
      console.error("Invalid image URL:", urlError);
      return NextResponse.json(
        { error: "Invalid image URLs provided" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check and deduct credits
    const { data: deductResult, error: deductError } = await supabase.rpc(
      "deduct_credits",
      {
        p_store_id: user.store_id,
        p_user_id: user.id,
        p_amount: 1,
        p_clothing_image_url: clothing_image,
      }
    );

    if (deductError || !deductResult) {
      console.error("Credit deduction error:", deductError);
      console.error("Deduct result:", deductResult);

      // Check if it's a missing function error
      if (deductError?.message?.includes("function") || deductError?.code === "42883") {
        return NextResponse.json(
          { error: "Database function 'deduct_credits' not found. Please run the SQL migration from supabase/add-clothing-url-to-history.sql" },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: deductError?.message || "Insufficient credits or failed to deduct credits" },
        { status: 402 }
      );
    }

    // Process virtual try-on
    try {
      console.log("Starting FAL AI virtual try-on:", {
        full_body_image: full_body_image.substring(0, 50) + "...",
        clothing_image: clothing_image.substring(0, 50) + "...",
        gender,
      });

      const result = await fal.subscribe("easel-ai/fashion-tryon", {
        input: {
          full_body_image,
          clothing_image,
          gender,
        },
        logs: true,
        onQueueUpdate: (update) => {
          console.log("FAL Queue Status:", update.status);
          if (update.status === "IN_PROGRESS") {
            update.logs?.map((log) => log.message).forEach(console.log);
          }
        },
      });

      console.log("FAL AI processing completed successfully");

      // Get updated credit balance
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("credits")
        .eq("id", user.store_id)
        .single();

      if (storeError) {
        console.error("Error fetching store credits:", storeError);
      }

      return NextResponse.json({
        ...result.data,
        credits_remaining: store?.credits || 0,
      });
    } catch (falError: any) {
      console.error("FAL AI Error:", falError);
      console.error("FAL Error Details:", {
        message: falError.message,
        stack: falError.stack,
        response: falError.response,
        body: falError.body,
        statusCode: falError.statusCode,
      });

      // Refund the credit since FAL failed
      try {
        await supabase.rpc("add_credits", {
          p_store_id: user.store_id,
          p_amount: 1,
          p_description: "Refund - Virtual try-on failed",
          p_created_by: user.id,
        });
        console.log("Credit refunded successfully");
      } catch (refundError) {
        console.error("Failed to refund credit:", refundError);
      }

      // Provide more specific error messages
      let errorMessage = "Failed to process virtual try-on";
      if (falError.message) {
        errorMessage = falError.message;
      }
      if (falError.statusCode === 401 || falError.statusCode === 403) {
        errorMessage = "Invalid FAL AI API key. Please check your configuration.";
      } else if (falError.statusCode === 429) {
        errorMessage = "FAL AI rate limit exceeded. Please try again later.";
      } else if (falError.statusCode === 400) {
        errorMessage = "Invalid request to FAL AI. Please check your image URLs.";
      }

      return NextResponse.json(
        { error: `FAL AI Error: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Virtual try-on error:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to process virtual try-on" },
      { status: 500 }
    );
  }
}
