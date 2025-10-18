import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

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

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, or WebP image." },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    console.log("Uploading file to FAL storage:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    const url = await fal.storage.upload(file);

    console.log("File uploaded successfully:", url);

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("Upload error:", error);
    console.error("Upload error details:", {
      message: error.message,
      statusCode: error.statusCode,
      response: error.response,
    });

    let errorMessage = "Failed to upload file";
    if (error.statusCode === 401 || error.statusCode === 403) {
      errorMessage = "Invalid FAL AI API key. Please check your configuration.";
    } else if (error.statusCode === 429) {
      errorMessage = "Rate limit exceeded. Please try again later.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
