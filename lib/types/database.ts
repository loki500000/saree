export type UserRole = 'super_admin' | 'store_admin' | 'store_user';
export type ImageType = 'clothing';
export type TransactionType = 'purchase' | 'usage' | 'refund';

export interface Store {
  id: string;
  name: string;
  slug: string;
  credits: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  store_id: string | null;
  role: UserRole;
  name: string;
  email: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreImage {
  id: string;
  store_id: string;
  url: string;
  type: ImageType;
  name: string | null;
  main_code?: string; // Optional until migration is complete
  sub_variant?: string; // Optional until migration is complete
  uploaded_by: string | null;
  created_at: string;
}

export interface TryonHistory {
  id: string;
  user_id: string;
  store_id: string;
  credits_used: number;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  store_id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  store_id: string | null;
  name: string;
}
