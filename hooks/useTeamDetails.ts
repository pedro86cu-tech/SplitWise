import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type TeamMember = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  joinedAt: string;
  isCurrentUser: boolean;
};

export type TeamDetails = {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  isCreator: boolean;
  memberCount: number;
  members: TeamMember[];
};

export type UserSearchResult = {
  id: string;
  fullName: string;
  email: string;
};

export function useTeamDetails(teamId: string) {
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && teamId) {
      loadTeamDetails();
    }
  }, [user, teamId]);

  const loadTeamDetails = async () => {
    if (!user || !teamId) return;

    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id, name, description, created_by')
        .eq('id', teamId)
        .maybeSingle();

      if (!teamData) {
        setTeam(null);
        setLoading(false);
        return;
      }

      const { data: membersData } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          joined_at,
          profiles!team_members_user_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('team_id', teamId);

      const membersWithEmails = (membersData || []).map((member: any) => ({
        id: member.id,
        userId: member.user_id,
        userName: member.profiles?.full_name || 'Usuario',
        userEmail: member.profiles?.email || '',
        joinedAt: member.joined_at,
        isCurrentUser: member.user_id === user.id,
      }));

      setTeam({
        id: teamData.id,
        name: teamData.name,
        description: teamData.description,
        createdBy: teamData.created_by,
        isCreator: teamData.created_by === user.id,
        memberCount: membersWithEmails.length,
        members: membersWithEmails,
      });
    } catch (error) {
      console.error('Error loading team details:', error);
      setTeam(null);
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      await loadTeamDetails();
      return true;
    } catch (error) {
      console.error('Error removing member:', error);
      return false;
    }
  };

  const recalculateExpenseSplits = async (newMemberId: string) => {
    try {
      const { data: expenses } = await supabase
        .from('expenses')
        .select('id, total_amount, paid_by')
        .eq('team_id', teamId);

      if (!expenses || expenses.length === 0) {
        return true;
      }

      const { data: allMembers } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId);

      if (!allMembers || allMembers.length === 0) {
        return true;
      }

      const memberCount = allMembers.length;

      for (const expense of expenses) {
        const newSplitAmount = expense.total_amount / memberCount;

        const { data: existingSplits } = await supabase
          .from('expense_splits')
          .select('id, user_id')
          .eq('expense_id', expense.id);

        for (const split of existingSplits || []) {
          await supabase
            .from('expense_splits')
            .update({
              amount: newSplitAmount,
              is_settled: split.user_id === expense.paid_by
            })
            .eq('id', split.id);
        }

        const { data: existingSplit } = await supabase
          .from('expense_splits')
          .select('id')
          .eq('expense_id', expense.id)
          .eq('user_id', newMemberId)
          .maybeSingle();

        if (!existingSplit) {
          await supabase
            .from('expense_splits')
            .insert({
              expense_id: expense.id,
              user_id: newMemberId,
              amount: newSplitAmount,
              is_settled: newMemberId === expense.paid_by,
            });
        }
      }

      return true;
    } catch (error) {
      console.error('Error recalculating expense splits:', error);
      return false;
    }
  };

  const addMember = async (email: string) => {
    try {
      const trimmedEmail = email.trim().toLowerCase();

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (userError || !userData) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      if (userData.id === user?.id) {
        return { success: false, error: 'No puedes agregarte a ti mismo' };
      }

      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userData.id,
        });

      if (memberError) {
        if (memberError.code === '23505') {
          return { success: false, error: 'El usuario ya es miembro del equipo' };
        }
        throw memberError;
      }

      const recalculated = await recalculateExpenseSplits(userData.id);

      if (!recalculated) {
        return {
          success: true,
          warning: 'Miembro agregado pero hubo un problema al recalcular los gastos'
        };
      }

      await loadTeamDetails();
      return { success: true };
    } catch (error) {
      console.error('Error adding member:', error);
      return { success: false, error: 'Error al agregar miembro' };
    }
  };

  const searchUsers = useCallback(async (query: string): Promise<UserSearchResult[]> => {
    if (!user || !query.trim()) return [];

    const cleanQuery = query.trim().replace(/[,%]/g, '');
    if (!cleanQuery) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .or(`full_name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%`)
      .limit(8);

    if (error || !data) {
      return [];
    }

    const existingMemberIds = new Set(team?.members.map((member) => member.userId) || []);

    return data
      .filter((candidate: any) => !!candidate.email)
      .filter((candidate: any) => candidate.id !== user.id)
      .filter((candidate: any) => !existingMemberIds.has(candidate.id))
      .map((candidate: any) => ({
        id: candidate.id,
        fullName: candidate.full_name || 'Usuario',
        email: candidate.email,
      }));
  }, [team?.members, user]);

  return { team, loading, refresh: loadTeamDetails, removeMember, addMember, searchUsers };
}
