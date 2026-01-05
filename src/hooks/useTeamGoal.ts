import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamGoal {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  goal_type: 'sessions' | 'shots' | 'participation' | 'badges';
  target_value: number;
  current_value: number;
  timeframe: 'week' | 'month' | 'custom';
  start_date: string;
  end_date: string;
  show_leaderboard: boolean;
  status: 'active' | 'completed' | 'failed' | 'archived';
  completed_at: string | null;
  created_by_user_id: string;
  created_at: string;
}

export interface GoalContribution {
  id: string;
  goal_id: string;
  player_id: string;
  contribution_value: number;
  player?: {
    first_name: string;
    last_initial: string | null;
    profile_photo_url: string | null;
  };
}

export function useTeamGoal(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-goal', teamId],
    queryFn: async () => {
      if (!teamId) return null;
      
      const { data, error } = await supabase
        .from('team_goals')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as TeamGoal | null;
    },
    enabled: !!teamId,
  });
}

export function useGoalContributions(goalId: string | undefined) {
  return useQuery({
    queryKey: ['goal-contributions', goalId],
    queryFn: async () => {
      if (!goalId) return [];
      
      const { data, error } = await supabase
        .from('team_goal_contributions')
        .select(`
          id,
          goal_id,
          player_id,
          contribution_value,
          players:player_id (
            first_name,
            last_initial,
            profile_photo_url
          )
        `)
        .eq('goal_id', goalId)
        .order('contribution_value', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        player: Array.isArray(item.players) ? item.players[0] : item.players
      })) as GoalContribution[];
    },
    enabled: !!goalId,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (goal: Omit<TeamGoal, 'id' | 'current_value' | 'status' | 'completed_at' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('team_goals')
        .insert(goal)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-goal', data.team_id] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TeamGoal> & { id: string }) => {
      const { data, error } = await supabase
        .from('team_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-goal', data.team_id] });
    },
  });
}

export function useRefreshGoalProgress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (goalId: string) => {
      const { data, error } = await supabase
        .rpc('calculate_goal_progress', { p_goal_id: goalId });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, goalId) => {
      queryClient.invalidateQueries({ queryKey: ['team-goal'] });
      queryClient.invalidateQueries({ queryKey: ['goal-contributions', goalId] });
    },
  });
}
