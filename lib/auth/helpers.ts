import { createClient } from "@/lib/supabase/server";
import { AuthUser, Profile } from "@/lib/types/database";

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient();

    // Add timeout wrapper for auth check
    const { data: { user }, error: authError } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null }, error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), 60000)
      ),
    ]).catch((err) => {
      console.error('Auth error:', err.message);
      return { data: { user: null }, error: err };
    });

    if (authError || !user) {
      return null;
    }

    // Add timeout wrapper for profile fetch
    const { data: profile, error: profileError } = await Promise.race([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single(),
      new Promise<{ data: null, error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 60000)
      ),
    ]).catch((err) => {
      console.error('Profile fetch error:', err.message);
      return { data: null, error: err };
    });

    if (profileError || !profile) {
      return null;
    }

    return {
      id: user.id,
      email: profile.email,
      role: profile.role,
      store_id: profile.store_id,
      name: profile.name,
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function requireRole(allowedRoles: string[]): Promise<AuthUser> {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden: Insufficient permissions');
  }

  return user;
}

export async function requireSuperAdmin(): Promise<AuthUser> {
  return requireRole(['super_admin']);
}

export async function requireStoreAdmin(): Promise<AuthUser> {
  return requireRole(['super_admin', 'store_admin']);
}

export function isSuperAdmin(user: AuthUser): boolean {
  return user.role === 'super_admin';
}

export function isStoreAdmin(user: AuthUser): boolean {
  return user.role === 'store_admin' || user.role === 'super_admin';
}

export async function checkStoreAccess(storeId: string): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) return false;
  if (user.role === 'super_admin') return true;

  return user.store_id === storeId;
}
