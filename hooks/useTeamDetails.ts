import { useState, useEffect } from 'react';
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
            email:id
          )
        `)
        .eq('team_id', teamId);

      const membersWithEmails = await Promise.all(
        (membersData || []).map(async (member: any) => {
          const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
          return {
            id: member.id,
            userId: member.user_id,
            userName: member.profiles?.full_name || 'Usuario',
            userEmail: userData?.user?.email || '',
            joinedAt: member.joined_at,
            isCurrentUser: member.user_id === user.id,
          };
        })
      );

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

  return { team, loading, refresh: loadTeamDetails, removeMember, addMember };
}
