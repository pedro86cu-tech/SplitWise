import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Team = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  event_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type TeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  joined_at: string;
};

export type Expense = {
  id: string;
  team_id: string;
  description: string;
  total_amount: number;
  currency: string;
  paid_by: string;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseSplit = {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  is_settled: boolean;
  created_at: string;
};

export type Settlement = {
  id: string;
  expense_split_id: string;
  settled_at: string;
  notes: string | null;
};
