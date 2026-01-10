import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type DebtSummary = {
  teamId: string;
  teamName: string;
  totalOwed: number;
  totalOwedToMe: number;
  netBalance: number;
};

export function useDebts() {
  const { user } = useAuth();
  const [debts, setDebts] = useState<DebtSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDebts();
    }
  }, [user]);

  const loadDebts = async () => {
    if (!user) return;

    try {
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id, teams(id, name)')
        .eq('user_id', user.id);

      if (!teamMemberships) {
        setDebts([]);
        setLoading(false);
        return;
      }

      const debtSummaries: DebtSummary[] = [];

      for (const membership of teamMemberships) {
        const teamId = membership.team_id;
        const teamName = (membership.teams as any)?.name || 'Team';

        const { data: owedToMe } = await supabase
          .from('expense_splits')
          .select('amount, expenses!inner(paid_by)')
          .eq('is_settled', false)
          .neq('user_id', user.id)
          .eq('expenses.paid_by', user.id);

        const { data: iOwe } = await supabase
          .from('expense_splits')
          .select('amount, expenses!inner(paid_by, team_id)')
          .eq('user_id', user.id)
          .eq('is_settled', false)
          .eq('expenses.team_id', teamId);

        const totalOwedToMe = owedToMe?.reduce((sum, split) => sum + Number(split.amount), 0) || 0;
        const totalOwed = iOwe?.reduce((sum, split) => sum + Number(split.amount), 0) || 0;
        const netBalance = totalOwedToMe - totalOwed;

        if (netBalance !== 0) {
          debtSummaries.push({
            teamId,
            teamName,
            totalOwed,
            totalOwedToMe,
            netBalance,
          });
        }
      }

      setDebts(debtSummaries);
    } catch (error) {
      console.error('Error loading debts:', error);
    } finally {
      setLoading(false);
    }
  };

  return { debts, loading, refresh: loadDebts };
}
