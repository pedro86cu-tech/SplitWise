import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type ExpenseWithDetails = {
  id: string;
  description: string;
  total_amount: number;
  currency: string;
  created_at: string;
  category: string;
  location: string | null;
  expense_date: string;
  receipt_image_url: string | null;
  team: {
    name: string;
  };
  paid_by_profile: {
    full_name: string;
  };
  my_split?: {
    amount: number;
    is_settled: boolean;
  };
  is_paid_by_me: boolean;
};

export function useExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadExpenses();
    }
  }, [user]);

  const loadExpenses = async () => {
    if (!user) return;

    try {
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id);

      if (!teamMemberships || teamMemberships.length === 0) {
        setExpenses([]);
        setLoading(false);
        return;
      }

      const teamIds = teamMemberships.map(m => m.team_id);

      const { data: expensesData } = await supabase
        .from('expenses')
        .select(`
          id,
          description,
          total_amount,
          currency,
          created_at,
          paid_by,
          category,
          location,
          expense_date,
          receipt_image_url,
          teams(name),
          profiles:paid_by(full_name)
        `)
        .in('team_id', teamIds)
        .order('expense_date', { ascending: false })
        .limit(50);

      if (!expensesData) {
        setExpenses([]);
        setLoading(false);
        return;
      }

      const expensesWithSplits = await Promise.all(
        expensesData.map(async (expense) => {
          const { data: mySplit } = await supabase
            .from('expense_splits')
            .select('amount, is_settled')
            .eq('expense_id', expense.id)
            .eq('user_id', user.id)
            .maybeSingle();

          return {
            id: expense.id,
            description: expense.description,
            total_amount: Number(expense.total_amount),
            currency: expense.currency,
            created_at: expense.created_at,
            category: expense.category || 'general',
            location: expense.location,
            expense_date: expense.expense_date,
            receipt_image_url: expense.receipt_image_url,
            team: { name: (expense.teams as any)?.name || 'Team' },
            paid_by_profile: { full_name: (expense.profiles as any)?.full_name || 'Usuario' },
            my_split: mySplit ? {
              amount: Number(mySplit.amount),
              is_settled: mySplit.is_settled,
            } : undefined,
            is_paid_by_me: expense.paid_by === user.id,
          };
        })
      );

      setExpenses(expensesWithSplits);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  return { expenses, loading, refresh: loadExpenses };
}
