import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type PaymentDetail = {
  splitId: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  isSettled: boolean;
  paymentProofUrl: string | null;
  settledAt: string | null;
  settledBy: string | null;
};

export type ExpenseDetails = {
  id: string;
  description: string;
  totalAmount: number;
  createdAt: string;
  paidByUserId: string;
  paidByName: string;
  category: string;
  receiptUrl: string | null;
  payments: PaymentDetail[];
};

export function useExpensePaymentDetails(expenseId: string) {
  const [details, setDetails] = useState<ExpenseDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (expenseId) {
      loadDetails();
    }
  }, [expenseId]);

  const loadDetails = async () => {
    try {
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select(`
          id,
          description,
          amount,
          created_at,
          paid_by,
          category,
          receipt_url,
          profiles!expenses_paid_by_fkey(
            id,
            full_name
          )
        `)
        .eq('id', expenseId)
        .single();

      if (expenseError) throw expenseError;

      const { data: splitsData, error: splitsError } = await supabase
        .from('expense_splits')
        .select(`
          id,
          user_id,
          amount,
          is_settled,
          payment_proof_url,
          settled_at,
          settled_by,
          profiles!expense_splits_user_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('expense_id', expenseId);

      if (splitsError) throw splitsError;

      const payments: PaymentDetail[] = splitsData?.map((split: any) => {
        const profile = Array.isArray(split.profiles) ? split.profiles[0] : split.profiles;
        return {
          splitId: split.id,
          userId: split.user_id,
          userName: profile?.full_name || 'Usuario',
          userEmail: profile?.email || '',
          amount: Number(split.amount),
          isSettled: split.is_settled,
          paymentProofUrl: split.payment_proof_url,
          settledAt: split.settled_at,
          settledBy: split.settled_by,
        };
      }) || [];

      const paidByProfile = Array.isArray(expenseData.profiles)
        ? expenseData.profiles[0]
        : expenseData.profiles;

      setDetails({
        id: expenseData.id,
        description: expenseData.description,
        totalAmount: Number(expenseData.amount),
        createdAt: expenseData.created_at,
        paidByUserId: expenseData.paid_by,
        paidByName: paidByProfile?.full_name || 'Usuario',
        category: expenseData.category || 'Otro',
        receiptUrl: expenseData.receipt_url,
        payments,
      });
    } catch (error) {
      console.error('Error loading expense payment details:', error);
    } finally {
      setLoading(false);
    }
  };

  return { details, loading, refresh: loadDetails };
}
