import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type DebtDetail = {
  splitId: string;
  userId: string;
  userName: string;
  amount: number;
  isSettled: boolean;
  expenseId: string;
  expenseDescription: string;
  expenseDate: string;
  paymentProofUrl?: string | null;
};

export type TeamDebtDetails = {
  owedToMe: DebtDetail[];
  iOwe: DebtDetail[];
};

export function useTeamDebtDetails(teamId: string) {
  const { user } = useAuth();
  const [details, setDetails] = useState<TeamDebtDetails>({
    owedToMe: [],
    iOwe: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && teamId) {
      loadDetails();
    }
  }, [user, teamId]);

  const loadDetails = async () => {
    if (!user || !teamId) return;

    try {
      const { data: owedToMeData } = await supabase
        .from('expense_splits')
        .select(`
          id,
          amount,
          is_settled,
          user_id,
          expense_id,
          payment_proof_url,
          expenses!inner(
            id,
            description,
            created_at,
            paid_by,
            team_id
          ),
          profiles!expense_splits_user_id_fkey(
            id,
            full_name
          )
        `)
        .eq('is_settled', false)
        .eq('expenses.paid_by', user.id)
        .eq('expenses.team_id', teamId)
        .neq('user_id', user.id);

      const { data: iOweData } = await supabase
        .from('expense_splits')
        .select(`
          id,
          amount,
          is_settled,
          user_id,
          expense_id,
          payment_proof_url,
          expenses!inner(
            id,
            description,
            created_at,
            paid_by,
            team_id
          ),
          profiles!expense_splits_user_id_fkey(
            id,
            full_name
          )
        `)
        .eq('user_id', user.id)
        .eq('is_settled', false)
        .eq('expenses.team_id', teamId);

      const owedToMe: DebtDetail[] = owedToMeData?.map((split: any) => ({
        splitId: split.id,
        userId: split.user_id,
        userName: split.profiles?.full_name || 'Usuario',
        amount: Number(split.amount),
        isSettled: split.is_settled,
        expenseId: split.expenses.id,
        expenseDescription: split.expenses.description,
        expenseDate: split.expenses.created_at,
        paymentProofUrl: split.payment_proof_url,
      })) || [];

      const iOwe: DebtDetail[] = iOweData?.map((split: any) => ({
        splitId: split.id,
        userId: split.user_id,
        userName: user.email || 'Tú',
        amount: Number(split.amount),
        isSettled: split.is_settled,
        expenseId: split.expenses.id,
        expenseDescription: split.expenses.description,
        expenseDate: split.expenses.created_at,
        paymentProofUrl: split.payment_proof_url,
      })) || [];

      setDetails({ owedToMe, iOwe });
    } catch (error) {
      console.error('Error loading team debt details:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsSettled = async (splitId: string) => {
    try {
      const { error } = await supabase
        .from('expense_splits')
        .update({
          is_settled: true,
          settled_by: user?.id,
          settled_at: new Date().toISOString(),
        })
        .eq('id', splitId);

      if (error) throw error;

      await loadDetails();
      return true;
    } catch (error) {
      console.error('Error marking as settled:', error);
      return false;
    }
  };

  const uploadPaymentProof = async (splitId: string, proofUrl: string) => {
    try {
      const { error } = await supabase
        .from('expense_splits')
        .update({ payment_proof_url: proofUrl })
        .eq('id', splitId);

      if (error) throw error;

      await loadDetails();
      return true;
    } catch (error) {
      console.error('Error uploading payment proof:', error);
      return false;
    }
  };

  return { details, loading, refresh: loadDetails, markAsSettled, uploadPaymentProof };
}
