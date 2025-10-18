import { NextRequest, NextResponse } from "next/server";
import { requireStoreAdmin } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { ImageType } from "@/lib/types/database";

export async function POST(request: NextRequest) {
  try {
    // Require store admin or super admin
    const user = await requireStoreAdmin();

    if (!user.store_id) {
      return NextResponse.json(
        { error: "User is not associated with any store" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as ImageType;
    const name = formData.get("name") as string | null;
    const main_code = formData.get("main_code") as string;
    const sub_variant = formData.get("sub_variant") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!type || type !== 'clothing') {
      return NextResponse.json(
        { error: "Invalid image type. Must be 'clothing'" },
        { status: 400 }
      );
    }

    // Validate variant fields
    if (!main_code || main_code.trim() === '') {
      return NextResponse.json(
        { error: "Main code is required" },
        { status: 400 }
      );
    }

    if (!sub_variant || sub_variant.trim() === '') {
      return NextResponse.json(
        { error: "Sub-variant is required" },
        { status: 400 }
      );
    }

    // Validate sub_variant is a single character
    if (sub_variant.length !== 1) {
      return NextResponse.json(
        { error: "Sub-variant must be a single character (e.g., 'a', 'b', 'c')" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WEBP" },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Upload to Supabase Storage
    const fileName = `${user.store_id}/${type}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('store-gallery')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: uploadError.message || "Failed to upload to storage" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('store-gallery')
      .getPublicUrl(fileName);

    // Auto-generate display name as main_code + sub_variant
    const displayName = name || `${main_code}${sub_variant}`;

    // Save metadata to database
    const { data: imageData, error: dbError } = await supabase
      .from('store_images')
      .insert({
        store_id: user.store_id,
        url: urlData.publicUrl,
        type: type,
        name: displayName,
        main_code: main_code.trim(),
        sub_variant: sub_variant.toLowerCase(),
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      // Try to delete the uploaded file
      await supabase.storage.from('store-gallery').remove([fileName]);
      return NextResponse.json(
        { error: dbError.message || "Failed to save image metadata" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Image uploaded successfully",
      image: imageData,
    });
  } catch (error: any) {
    console.error("Upload error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}
