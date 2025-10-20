import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInvoicePDF, generateInvoiceNumber } from "@/lib/billing/generateInvoice";

// POST - Add credits to a store
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperAdmin();
    const { id: storeId } = await params;
    const body = await request.json();
    const { amount, description, generateInvoice = true } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify store exists
    const { data: store, error: storeError } = await adminClient
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    // Add credits using the database function
    const { error: addError } = await adminClient.rpc("add_credits", {
      p_store_id: storeId,
      p_amount: amount,
      p_description: description || "Credits added by admin",
      p_created_by: null,
    });

    if (addError) {
      console.error("Add credits error:", addError);
      return NextResponse.json(
        { error: addError.message || "Failed to add credits" },
        { status: 500 }
      );
    }

    // Get updated store data
    const { data: updatedStore } = await adminClient
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single();

    let invoiceData = null;

    // Generate invoice if requested
    if (generateInvoice && updatedStore) {
      // Fetch billing settings from database
      const { data: settingsData } = await adminClient
        .from('system_settings')
        .select('setting_key, setting_value, setting_type')
        .in('setting_key', ['credit_price', 'gst_rate', 'platform_name']);

      // Parse settings
      const settings: Record<string, any> = {};
      settingsData?.forEach((setting) => {
        let value = setting.setting_value;
        if (setting.setting_type === 'number') {
          value = parseFloat(value);
        }
        settings[setting.setting_key] = value;
      });

      const pricePerCredit = settings.credit_price ?? 10;
      const gstRate = settings.gst_rate ?? 0.18;
      const platformName = settings.platform_name ?? 'Virtual Try-On';

      const invoiceNumber = generateInvoiceNumber();

      // Generate PDF with dynamic pricing
      const pdf = generateInvoicePDF({
        invoiceNumber,
        date: new Date().toISOString(),
        storeName: updatedStore.name,
        storeId: updatedStore.id,
        credits: amount,
        description: description || 'Credit Purchase',
        createdBy: user.email,
        pricePerCredit,
        gstRate,
        platformName
      });

      // Convert PDF to base64 for storage (using arraybuffer instead of blob)
      const pdfArrayBuffer = pdf.output('arraybuffer');
      const base64PDF = Buffer.from(pdfArrayBuffer).toString('base64');

      // Calculate invoice amounts using dynamic pricing
      const subtotal = amount * pricePerCredit;
      const tax = subtotal * gstRate;
      const total = subtotal + tax;

      // Save invoice to database
      const { data: savedInvoice, error: invoiceError } = await adminClient
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          store_id: storeId,
          credits: amount,
          subtotal,
          tax,
          total,
          description: description || 'Credit Purchase',
          pdf_data: base64PDF,
          created_by: user.id
        })
        .select()
        .single();

      if (!invoiceError && savedInvoice) {
        invoiceData = {
          id: savedInvoice.id,
          invoiceNumber: savedInvoice.invoice_number,
          invoiceUrl: `/api/admin/invoices/${savedInvoice.id}/download`
        };
      }
    }

    return NextResponse.json({
      message: "Credits added successfully",
      store: updatedStore,
      invoice: invoiceData
    });
  } catch (error: any) {
    console.error("Add credits error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to add credits" },
      { status: 500 }
    );
  }
}
