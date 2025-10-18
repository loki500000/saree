import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (!user.store_id) {
      return NextResponse.json(
        { error: "User is not associated with any store" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'person' or 'clothing'
    const grouped = searchParams.get('grouped') === 'true'; // Whether to group by main_code

    const supabase = await createClient();

    let query = supabase
      .from('store_images')
      .select('*')
      .eq('store_id', user.store_id)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data: images, error } = await query;

    if (error) {
      console.error("Fetch images error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch images" },
        { status: 500 }
      );
    }

    // Group images by main_code if requested
    if (grouped && images) {
      const groupedImages: Record<string, any[]> = {};

      images.forEach((image: any) => {
        const mainCode = image.main_code || 'ungrouped';
        if (!groupedImages[mainCode]) {
          groupedImages[mainCode] = [];
        }
        groupedImages[mainCode].push(image);
      });

      // Sort variants within each group by sub_variant
      Object.keys(groupedImages).forEach(mainCode => {
        groupedImages[mainCode].sort((a, b) =>
          (a.sub_variant || '').localeCompare(b.sub_variant || '')
        );
      });

      return NextResponse.json({
        images,
        grouped: groupedImages,
        mainCodes: Object.keys(groupedImages).sort()
      });
    }

    return NextResponse.json({ images });
  } catch (error: any) {
    console.error("Get images error:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to get images" },
      { status: 500 }
    );
  }
}
