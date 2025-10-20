import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';

// GET - Get all invoices with filtering
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('invoices')
      .select(`
        *,
        store:stores!invoices_store_id_fkey(name)
      `)
      .order('created_at', { ascending: false });

    // Apply store filter
    if (storeId && storeId !== 'all') {
      query = query.eq('store_id', storeId);
    }

    const { data: invoices, error: invoicesError } = await query;

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
      return NextResponse.json(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const allInvoices = await supabase
      .from('invoices')
      .select('credits, total');

    const summary = {
      totalInvoices: 0,
      totalCredits: 0,
      totalRevenue: 0,
    };

    if (allInvoices.data) {
      summary.totalInvoices = allInvoices.data.length;
      allInvoices.data.forEach((inv) => {
        summary.totalCredits += inv.credits || 0;
        summary.totalRevenue += inv.total || 0;
      });
    }

    // Format invoices with store name
    const formattedInvoices = invoices?.map((inv: any) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      store_id: inv.store_id,
      store_name: inv.store?.name || 'Unknown Store',
      credits: inv.credits,
      subtotal: inv.subtotal,
      tax: inv.tax,
      total: inv.total,
      description: inv.description,
      created_at: inv.created_at,
      created_by: inv.created_by,
    })) || [];

    return NextResponse.json({
      invoices: formattedInvoices,
      summary,
    });
  } catch (error: any) {
    console.error('Invoices API error:', error);

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
