import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type TeamWithMembers = {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  member_count: number;
  is_creator: boolean;
};

export function useTeams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTeams();
    }
  }, [user]);

  const loadTeams = async () => {
    if (!user) {
      console.log('useTeams: No user found');
      setLoading(false);
      return;
    }

    console.log('useTeams: Loading teams for user:', user.id);

    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (teamsError) {
        console.error('useTeams: Error loading teams:', teamsError);
        throw teamsError;
      }

      console.log('useTeams: Teams loaded:', teamsData?.length || 0, 'teams');

      if (!teamsData || teamsData.length === 0) {
        console.log('useTeams: No teams found');
        setTeams([]);
        setLoading(false);
        return;
      }

      const teamsWithCounts = await Promise.all(
        teamsData.map(async (team) => {
          const { count, error: countError } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);

          if (countError) {
            console.error('useTeams: Error counting members for team', team.id, ':', countError);
          }

          return {
            id: team.id,
            name: team.name,
            description: team.description,
            created_by: team.created_by,
            created_at: team.created_at,
            member_count: count || 0,
            is_creator: team.created_by === user.id,
          };
        })
      );

      console.log('useTeams: Teams with counts:', teamsWithCounts);
      setTeams(teamsWithCounts);
    } catch (error: any) {
      console.error('useTeams: Error loading teams:', error);
      console.error('useTeams: Error details:', error.message, error.details, error.hint);
    } finally {
      setLoading(false);
    }
  };

  return { teams, loading, refresh: loadTeams };
}
