import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';

// GET - Get all credit transactions with filtering
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const storeId = searchParams.get('storeId');

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('credit_transactions')
      .select(`
        *,
        store:stores!credit_transactions_store_id_fkey(name)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    if (storeId && storeId !== 'all') {
      query = query.eq('store_id', storeId);
    }

    const { data: transactions, error: transactionsError } = await query;

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const allTransactions = await supabase
      .from('credit_transactions')
      .select('type, amount');

    const summary = {
      totalPurchased: 0,
      totalUsed: 0,
      totalRefunded: 0,
      currentBalance: 0,
    };

    if (allTransactions.data) {
      allTransactions.data.forEach((t) => {
        if (t.type === 'purchase') {
          summary.totalPurchased += t.amount;
        } else if (t.type === 'usage') {
          summary.totalUsed += Math.abs(t.amount);
        } else if (t.type === 'refund') {
          summary.totalRefunded += t.amount;
        }
      });
    }

    // Get current total balance from all stores
    const { data: stores } = await supabase
      .from('stores')
      .select('credits');

    if (stores) {
      summary.currentBalance = stores.reduce((sum, s) => sum + (s.credits || 0), 0);
    }

    // Format transactions with store name and calculate running balance
    // Group transactions by store to calculate balance_after
    const storeBalances: Record<string, number> = {};

    // Get current balance for each store
    if (stores) {
      stores.forEach(store => {
        if (store.credits != null) {
          storeBalances[transactions?.find(t => t.store_id)?.store_id || ''] = store.credits;
        }
      });
    }

    const formattedTransactions = transactions?.map((t: any) => {
      // Use balance_after from DB if available, otherwise show null
      // The balance_after field may not be populated in older transactions
      return {
        id: t.id,
        store_id: t.store_id,
        store_name: t.store?.name || 'Unknown Store',
        type: t.type,
        amount: t.amount,
        balance_after: t.balance_after ?? null,
        description: t.description,
        created_at: t.created_at,
        created_by: t.created_by,
      };
    }) || [];

    return NextResponse.json({
      transactions: formattedTransactions,
      summary,
    });
  } catch (error: any) {
    console.error('Billing API error:', error);

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch billing data' },
      { status: 500 }
    );
  }
}
