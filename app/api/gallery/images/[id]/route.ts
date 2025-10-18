import { NextRequest, NextResponse } from "next/server";
import { requireStoreAdmin } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireStoreAdmin();
    const { id } = await params;

    if (!user.store_id) {
      return NextResponse.json(
        { error: "User is not associated with any store" },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    // Get image details first
    const { data: image, error: fetchError } = await supabase
      .from('store_images')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !image) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    // Check if user has permission (must be from same store or super admin)
    if (image.store_id !== user.store_id && user.role !== 'super_admin') {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Extract file path from URL
    const url = new URL(image.url);
    const pathParts = url.pathname.split('/storage/v1/object/public/store-gallery/');
    const filePath = pathParts[1];

    // Delete from storage
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('store-gallery')
        .remove([filePath]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('store_images')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error("Database delete error:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete image" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Image deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete image error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to delete image" },
      { status: 500 }
    );
  }
}
