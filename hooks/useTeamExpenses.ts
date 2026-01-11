import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type TeamExpense = {
  id: string;
  description: string;
  totalAmount: number;
  paidBy: string;
  paidByName: string;
  category: string;
  location: string | null;
  expenseDate: string;
  createdAt: string;
  receiptImageUrl: string | null;
  isUserPayer: boolean;
};

export function useTeamExpenses(teamId: string) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<TeamExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredExpenses, setFilteredExpenses] = useState<TeamExpense[]>([]);
  const [filters, setFilters] = useState({
    category: 'all',
    dateFrom: '',
    dateTo: '',
    location: '',
  });

  useEffect(() => {
    if (user && teamId) {
      loadExpenses();
    }
  }, [user, teamId]);

  useEffect(() => {
    applyFilters();
  }, [expenses, filters]);

  const loadExpenses = async () => {
    if (!user || !teamId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          id,
          description,
          total_amount,
          paid_by,
          category,
          location,
          expense_date,
          created_at,
          receipt_image_url,
          profiles!expenses_paid_by_fkey(
            id,
            full_name
          )
        `)
        .eq('team_id', teamId)
        .order('expense_date', { ascending: false });

      if (error) throw error;

      const mappedExpenses: TeamExpense[] = (data || []).map((expense: any) => ({
        id: expense.id,
        description: expense.description,
        totalAmount: Number(expense.total_amount),
        paidBy: expense.paid_by,
        paidByName: expense.profiles?.full_name || 'Usuario',
        category: expense.category || 'general',
        location: expense.location,
        expenseDate: expense.expense_date,
        createdAt: expense.created_at,
        receiptImageUrl: expense.receipt_image_url,
        isUserPayer: expense.paid_by === user.id,
      }));

      setExpenses(mappedExpenses);
    } catch (error) {
      console.error('Error loading team expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...expenses];

    if (filters.category !== 'all') {
      filtered = filtered.filter(exp => exp.category === filters.category);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(exp => exp.expenseDate >= filters.dateFrom);
    }

    if (filters.dateTo) {
      filtered = filtered.filter(exp => exp.expenseDate <= filters.dateTo);
    }

    if (filters.location) {
      filtered = filtered.filter(exp =>
        exp.location?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    setFilteredExpenses(filtered);
  };

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      category: 'all',
      dateFrom: '',
      dateTo: '',
      location: '',
    });
  };

  return {
    expenses: filteredExpenses,
    loading,
    filters,
    updateFilters,
    clearFilters,
    refresh: loadExpenses,
    hasActiveFilters: filters.category !== 'all' || filters.dateFrom || filters.dateTo || filters.location,
  };
}
