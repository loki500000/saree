import { NextRequest, NextResponse } from 'next/server';
import { requireStoreAdmin } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';

// GET - Download invoice PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireStoreAdmin();
    const { id: invoiceId } = await params;

    const supabase = await createClient();

    // Fetch invoice
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, store:stores!invoices_store_id_fkey(name)')
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (user.role !== 'super_admin' && invoice.store_id !== user.store_id) {
      return NextResponse.json(
        { error: 'Unauthorized to access this invoice' },
        { status: 403 }
      );
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(invoice.pdf_data, 'base64');

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${invoice.invoice_number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });
  } catch (error: any) {
    console.error('Download invoice error:', error);

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to download invoice' },
      { status: 500 }
    );
  }
}
