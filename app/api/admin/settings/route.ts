import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';

// GET - Get all settings
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const supabase = await createClient();

    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('setting_key');

    if (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    // Transform to key-value object
    const settingsObj: Record<string, any> = {};
    settings?.forEach((setting) => {
      let value = setting.setting_value;

      // Parse based on type
      if (setting.setting_type === 'number') {
        value = parseFloat(value);
      } else if (setting.setting_type === 'boolean') {
        value = value === 'true';
      } else if (setting.setting_type === 'json') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          console.error('Failed to parse JSON setting:', setting.setting_key);
        }
      }

      settingsObj[setting.setting_key] = {
        value,
        type: setting.setting_type,
        description: setting.description,
        updated_at: setting.updated_at
      };
    });

    return NextResponse.json({ settings: settingsObj });
  } catch (error: any) {
    console.error('Settings API error:', error);

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT - Update settings
export async function PUT(request: NextRequest) {
  try {
    const user = await requireSuperAdmin();

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid settings data' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Update each setting
    const updates = Object.entries(settings).map(async ([key, value]) => {
      // Convert value to string for storage
      let stringValue: string;
      if (typeof value === 'object') {
        stringValue = JSON.stringify(value);
      } else {
        stringValue = String(value);
      }

      const { error } = await supabase
        .from('system_settings')
        .update({
          setting_value: stringValue,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', key);

      if (error) {
        console.error(`Error updating setting ${key}:`, error);
        throw error;
      }
    });

    await Promise.all(updates);

    return NextResponse.json({
      message: 'Settings updated successfully'
    });
  } catch (error: any) {
    console.error('Update settings error:', error);

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
