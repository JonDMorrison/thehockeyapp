export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_generations: {
        Row: {
          created_at: string | null
          created_by_user_id: string
          error: string | null
          generation_type: string
          id: string
          input_json: Json
          output_json: Json | null
          status: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          created_by_user_id: string
          error?: string | null
          generation_type: string
          id?: string
          input_json: Json
          output_json?: Json | null
          status?: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string
          error?: string | null
          generation_type?: string
          id?: string
          input_json?: Json
          output_json?: Json | null
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          badge_icon: string
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          metric_type: string
          name: string
          scope: string | null
          target_value: number
        }
        Insert: {
          badge_icon: string
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          metric_type: string
          name: string
          scope?: string | null
          target_value: number
        }
        Update: {
          badge_icon?: string
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          metric_type?: string
          name?: string
          scope?: string | null
          target_value?: number
        }
        Relationships: []
      }
      offline_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          local_event_id: string
          payload: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          local_event_id: string
          payload: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          local_event_id?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      personal_practice_cards: {
        Row: {
          created_at: string | null
          date: string
          id: string
          mode: string | null
          notes: string | null
          player_id: string
          published_at: string | null
          tier: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          mode?: string | null
          notes?: string | null
          player_id: string
          published_at?: string | null
          tier?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          mode?: string | null
          notes?: string | null
          player_id?: string
          published_at?: string | null
          tier?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_practice_cards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_practice_tasks: {
        Row: {
          created_at: string | null
          id: string
          is_required: boolean | null
          label: string
          personal_practice_card_id: string
          shot_type: string | null
          shots_expected: number | null
          sort_order: number
          target_type: string | null
          target_value: number | null
          task_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          label: string
          personal_practice_card_id: string
          shot_type?: string | null
          shots_expected?: number | null
          sort_order?: number
          target_type?: string | null
          target_value?: number | null
          task_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          label?: string
          personal_practice_card_id?: string
          shot_type?: string | null
          shots_expected?: number | null
          sort_order?: number
          target_type?: string | null
          target_value?: number | null
          task_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_practice_tasks_personal_practice_card_id_fkey"
            columns: ["personal_practice_card_id"]
            isOneToOne: false
            referencedRelation: "personal_practice_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_training_plans: {
        Row: {
          created_at: string | null
          days_per_week: number | null
          id: string
          is_active: boolean | null
          name: string
          player_id: string
          tier: string | null
          training_focus: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          days_per_week?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          player_id: string
          tier?: string | null
          training_focus?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          days_per_week?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          player_id?: string
          tier?: string | null
          training_focus?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_training_plans_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_badges: {
        Row: {
          awarded_at: string | null
          challenge_id: string
          id: string
          player_id: string
        }
        Insert: {
          awarded_at?: string | null
          challenge_id: string
          id?: string
          player_id: string
        }
        Update: {
          awarded_at?: string | null
          challenge_id?: string
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_badges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_badges_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_challenge_progress: {
        Row: {
          challenge_id: string
          completed: boolean | null
          completed_at: string | null
          current_value: number | null
          id: string
          player_id: string
          updated_at: string | null
        }
        Insert: {
          challenge_id: string
          completed?: boolean | null
          completed_at?: string | null
          current_value?: number | null
          id?: string
          player_id: string
          updated_at?: string | null
        }
        Update: {
          challenge_id?: string
          completed?: boolean | null
          completed_at?: string | null
          current_value?: number | null
          id?: string
          player_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_challenge_progress_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_guardian_invites: {
        Row: {
          created_at: string | null
          created_by_user_id: string | null
          expires_at: string
          id: string
          invited_email: string
          player_id: string | null
          status: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          created_by_user_id?: string | null
          expires_at: string
          id?: string
          invited_email: string
          player_id?: string | null
          status?: string | null
          token: string
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string | null
          expires_at?: string
          id?: string
          invited_email?: string
          player_id?: string | null
          status?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_guardian_invites_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_guardians: {
        Row: {
          created_at: string | null
          guardian_role: string
          player_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          guardian_role: string
          player_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          guardian_role?: string
          player_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_guardians_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_privacy_settings: {
        Row: {
          national_challenges_opt_in: boolean | null
          player_id: string
          updated_at: string | null
        }
        Insert: {
          national_challenges_opt_in?: boolean | null
          player_id: string
          updated_at?: string | null
        }
        Update: {
          national_challenges_opt_in?: boolean | null
          player_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_privacy_settings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_team_preferences: {
        Row: {
          active_team_id: string | null
          player_id: string
          updated_at: string | null
        }
        Insert: {
          active_team_id?: string | null
          player_id: string
          updated_at?: string | null
        }
        Update: {
          active_team_id?: string | null
          player_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_team_preferences_active_team_id_fkey"
            columns: ["active_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_team_preferences_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_week_summaries: {
        Row: {
          created_at: string | null
          created_by_user_id: string
          id: string
          player_id: string
          summary_text: string
          team_id: string
          week_start: string
        }
        Insert: {
          created_at?: string | null
          created_by_user_id: string
          id?: string
          player_id: string
          summary_text: string
          team_id: string
          week_start: string
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string
          id?: string
          player_id?: string
          summary_text?: string
          team_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_week_summaries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_week_summaries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          birth_year: number
          created_at: string | null
          fav_nhl_city: string | null
          fav_nhl_player: string | null
          first_name: string
          hockey_love: string | null
          id: string
          jersey_number: string | null
          last_initial: string | null
          owner_user_id: string
          profile_photo_url: string | null
          season_goals: string | null
          shoots: string | null
        }
        Insert: {
          birth_year: number
          created_at?: string | null
          fav_nhl_city?: string | null
          fav_nhl_player?: string | null
          first_name: string
          hockey_love?: string | null
          id?: string
          jersey_number?: string | null
          last_initial?: string | null
          owner_user_id: string
          profile_photo_url?: string | null
          season_goals?: string | null
          shoots?: string | null
        }
        Update: {
          birth_year?: number
          created_at?: string | null
          fav_nhl_city?: string | null
          fav_nhl_player?: string | null
          first_name?: string
          hockey_love?: string | null
          id?: string
          jersey_number?: string | null
          last_initial?: string | null
          owner_user_id?: string
          profile_photo_url?: string | null
          season_goals?: string | null
          shoots?: string | null
        }
        Relationships: []
      }
      practice_cards: {
        Row: {
          created_at: string | null
          created_by_user_id: string
          date: string
          id: string
          locked: boolean | null
          mode: string | null
          notes: string | null
          published_at: string | null
          team_id: string
          tier: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_user_id: string
          date: string
          id?: string
          locked?: boolean | null
          mode?: string | null
          notes?: string | null
          published_at?: string | null
          team_id: string
          tier?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string
          date?: string
          id?: string
          locked?: boolean | null
          mode?: string | null
          notes?: string | null
          published_at?: string | null
          team_id?: string
          tier?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_cards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_tasks: {
        Row: {
          coach_notes: string | null
          created_at: string | null
          id: string
          is_required: boolean | null
          label: string
          practice_card_id: string
          shot_type: string | null
          shots_expected: number | null
          sort_order: number
          target_type: string | null
          target_value: number | null
          task_type: string
          updated_at: string | null
        }
        Insert: {
          coach_notes?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          label: string
          practice_card_id: string
          shot_type?: string | null
          shots_expected?: number | null
          sort_order: number
          target_type?: string | null
          target_value?: number | null
          task_type: string
          updated_at?: string | null
        }
        Update: {
          coach_notes?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          label?: string
          practice_card_id?: string
          shot_type?: string | null
          shots_expected?: number | null
          sort_order?: number
          target_type?: string | null
          target_value?: number | null
          task_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_tasks_practice_card_id_fkey"
            columns: ["practice_card_id"]
            isOneToOne: false
            referencedRelation: "practice_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      session_completions: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          id: string
          local_event_id: string | null
          player_id: string
          practice_card_id: string
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          local_event_id?: string | null
          player_id: string
          practice_card_id: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          local_event_id?: string | null
          player_id?: string
          practice_card_id?: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_completions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_completions_practice_card_id_fkey"
            columns: ["practice_card_id"]
            isOneToOne: false
            referencedRelation: "practice_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      session_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          player_id: string
          practice_card_id: string
          storage_path: string
          uploaded_by_user_id: string
          visibility: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          player_id: string
          practice_card_id: string
          storage_path: string
          uploaded_by_user_id: string
          visibility?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          player_id?: string
          practice_card_id?: string
          storage_path?: string
          uploaded_by_user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_photos_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_photos_practice_card_id_fkey"
            columns: ["practice_card_id"]
            isOneToOne: false
            referencedRelation: "practice_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          completed_by: string | null
          id: string
          local_event_id: string | null
          player_id: string
          practice_task_id: string
          shots_logged: number | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          local_event_id?: string | null
          player_id: string
          practice_task_id: string
          shots_logged?: number | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          local_event_id?: string | null
          player_id?: string
          practice_task_id?: string
          shots_logged?: number | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_practice_task_id_fkey"
            columns: ["practice_task_id"]
            isOneToOne: false
            referencedRelation: "practice_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      team_adult_invites: {
        Row: {
          created_at: string | null
          created_by_user_id: string
          expires_at: string
          id: string
          invited_email: string
          role: string
          status: string | null
          team_id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          created_by_user_id: string
          expires_at: string
          id?: string
          invited_email: string
          role: string
          status?: string | null
          team_id: string
          token: string
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string
          expires_at?: string
          id?: string
          invited_email?: string
          role?: string
          status?: string | null
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_adult_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_events: {
        Row: {
          created_at: string | null
          end_time: string | null
          event_type: string
          external_event_id: string
          id: string
          is_cancelled: boolean | null
          location: string | null
          source_type: string
          start_time: string
          team_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          event_type: string
          external_event_id: string
          id?: string
          is_cancelled?: boolean | null
          location?: string | null
          source_type: string
          start_time: string
          team_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          event_type?: string
          external_event_id?: string
          id?: string
          is_cancelled?: boolean | null
          location?: string | null
          source_type?: string
          start_time?: string
          team_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_game_days: {
        Row: {
          created_at: string | null
          created_by_user_id: string
          date: string
          enabled: boolean | null
          id: string
          notes: string | null
          team_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_user_id: string
          date: string
          enabled?: boolean | null
          id?: string
          notes?: string | null
          team_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string
          date?: string
          enabled?: boolean | null
          id?: string
          notes?: string | null
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_game_days_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_goal_contributions: {
        Row: {
          contribution_value: number
          goal_id: string
          id: string
          player_id: string
          updated_at: string
        }
        Insert: {
          contribution_value?: number
          goal_id: string
          id?: string
          player_id: string
          updated_at?: string
        }
        Update: {
          contribution_value?: number
          goal_id?: string
          id?: string
          player_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "team_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_goal_contributions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      team_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by_user_id: string
          current_value: number
          description: string | null
          end_date: string
          goal_type: string
          id: string
          name: string
          reward_description: string | null
          reward_type: string | null
          show_leaderboard: boolean
          start_date: string
          status: string
          target_value: number
          team_id: string
          timeframe: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by_user_id: string
          current_value?: number
          description?: string | null
          end_date: string
          goal_type: string
          id?: string
          name: string
          reward_description?: string | null
          reward_type?: string | null
          show_leaderboard?: boolean
          start_date: string
          status?: string
          target_value: number
          team_id: string
          timeframe: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string
          current_value?: number
          description?: string | null
          end_date?: string
          goal_type?: string
          id?: string
          name?: string
          reward_description?: string | null
          reward_type?: string | null
          show_leaderboard?: boolean
          start_date?: string
          status?: string
          target_value?: number
          team_id?: string
          timeframe?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          created_at: string | null
          created_by_user_id: string
          expires_at: string
          id: string
          status: string | null
          team_id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          created_by_user_id: string
          expires_at: string
          id?: string
          status?: string | null
          team_id: string
          token: string
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string
          expires_at?: string
          id?: string
          status?: string | null
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          id: string
          joined_at: string | null
          player_id: string
          status: string | null
          team_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          player_id: string
          status?: string | null
          team_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          player_id?: string
          status?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_onboarding_state: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          last_step_completed: string | null
          team_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          last_step_completed?: string | null
          team_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          last_step_completed?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_onboarding_state_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_roles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_schedule_sources: {
        Row: {
          auto_game_day: boolean | null
          created_at: string | null
          created_by_user_id: string
          ical_url: string
          id: string
          include_practices: boolean | null
          last_synced_at: string | null
          source_type: string
          sync_error: string | null
          sync_status: string | null
          team_id: string
          timezone: string
          updated_at: string | null
        }
        Insert: {
          auto_game_day?: boolean | null
          created_at?: string | null
          created_by_user_id: string
          ical_url: string
          id?: string
          include_practices?: boolean | null
          last_synced_at?: string | null
          source_type: string
          sync_error?: string | null
          sync_status?: string | null
          team_id: string
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          auto_game_day?: boolean | null
          created_at?: string | null
          created_by_user_id?: string
          ical_url?: string
          id?: string
          include_practices?: boolean | null
          last_synced_at?: string | null
          source_type?: string
          sync_error?: string | null
          sync_status?: string | null
          team_id?: string
          timezone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_schedule_sources_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_settings: {
        Row: {
          challenges_enabled: boolean | null
          team_id: string
          updated_at: string | null
        }
        Insert: {
          challenges_enabled?: boolean | null
          team_id: string
          updated_at?: string | null
        }
        Update: {
          challenges_enabled?: boolean | null
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_training_preferences: {
        Row: {
          allowed_task_types: string[] | null
          created_at: string | null
          default_tier: string | null
          team_id: string
          training_mode: string | null
          updated_at: string | null
          use_ai_assist: boolean | null
        }
        Insert: {
          allowed_task_types?: string[] | null
          created_at?: string | null
          default_tier?: string | null
          team_id: string
          training_mode?: string | null
          updated_at?: string | null
          use_ai_assist?: boolean | null
        }
        Update: {
          allowed_task_types?: string[] | null
          created_at?: string | null
          default_tier?: string | null
          team_id?: string
          training_mode?: string | null
          updated_at?: string | null
          use_ai_assist?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "team_training_preferences_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_week_plan_days: {
        Row: {
          created_at: string | null
          date: string
          id: string
          notes: string | null
          team_week_plan_id: string
          title: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          team_week_plan_id: string
          title?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          team_week_plan_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_week_plan_days_team_week_plan_id_fkey"
            columns: ["team_week_plan_id"]
            isOneToOne: false
            referencedRelation: "team_week_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      team_week_plan_tasks: {
        Row: {
          created_at: string | null
          id: string
          is_required: boolean | null
          label: string
          shot_type: string | null
          shots_expected: number | null
          sort_order: number
          target_type: string | null
          target_value: number | null
          task_type: string
          team_week_plan_day_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          label: string
          shot_type?: string | null
          shots_expected?: number | null
          sort_order: number
          target_type?: string | null
          target_value?: number | null
          task_type: string
          team_week_plan_day_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          label?: string
          shot_type?: string | null
          shots_expected?: number | null
          sort_order?: number
          target_type?: string | null
          target_value?: number | null
          task_type?: string
          team_week_plan_day_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_week_plan_tasks_team_week_plan_day_id_fkey"
            columns: ["team_week_plan_day_id"]
            isOneToOne: false
            referencedRelation: "team_week_plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      team_week_plans: {
        Row: {
          created_at: string | null
          created_by_user_id: string
          id: string
          name: string
          program_id: string | null
          start_date: string
          status: string | null
          team_id: string
          tier: string | null
          updated_at: string | null
          use_tier_scaling: boolean | null
        }
        Insert: {
          created_at?: string | null
          created_by_user_id: string
          id?: string
          name: string
          program_id?: string | null
          start_date: string
          status?: string | null
          team_id: string
          tier?: string | null
          updated_at?: string | null
          use_tier_scaling?: boolean | null
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string
          id?: string
          name?: string
          program_id?: string | null
          start_date?: string
          status?: string | null
          team_id?: string
          tier?: string | null
          updated_at?: string | null
          use_tier_scaling?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "team_week_plans_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_week_plans_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_week_summaries: {
        Row: {
          created_at: string | null
          created_by_user_id: string
          id: string
          summary_text: string
          team_id: string
          week_start: string
        }
        Insert: {
          created_at?: string | null
          created_by_user_id: string
          id?: string
          summary_text: string
          team_id: string
          week_start: string
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string
          id?: string
          summary_text?: string
          team_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_week_summaries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          created_by_user_id: string
          description: string | null
          id: string
          name: string
          palette_id: string
          season_label: string | null
          team_logo_url: string | null
          team_photo_url: string | null
          updated_at: string | null
          values_text: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_user_id: string
          description?: string | null
          id?: string
          name: string
          palette_id?: string
          season_label?: string | null
          team_logo_url?: string | null
          team_photo_url?: string | null
          updated_at?: string | null
          values_text?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string
          description?: string | null
          id?: string
          name?: string
          palette_id?: string
          season_label?: string | null
          team_logo_url?: string | null
          team_photo_url?: string | null
          updated_at?: string | null
          values_text?: string | null
        }
        Relationships: []
      }
      training_programs: {
        Row: {
          created_at: string | null
          created_by_user_id: string
          days_per_week: number | null
          description: string | null
          end_date: string
          focus_areas: string[] | null
          id: string
          name: string
          start_date: string
          status: string | null
          team_id: string
          tier: string | null
          time_budget_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_user_id: string
          days_per_week?: number | null
          description?: string | null
          end_date: string
          focus_areas?: string[] | null
          id?: string
          name: string
          start_date: string
          status?: string | null
          team_id: string
          tier?: string | null
          time_budget_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string
          days_per_week?: number | null
          description?: string | null
          end_date?: string
          focus_areas?: string[] | null
          id?: string
          name?: string
          start_date?: string
          status?: string | null
          team_id?: string
          tier?: string | null
          time_budget_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_programs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_privacy_settings: {
        Row: {
          allow_lock_screen_actions: boolean | null
          lock_screen_show_player_name: boolean | null
          lock_screen_show_team_name: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_lock_screen_actions?: boolean | null
          lock_screen_show_player_name?: boolean | null
          lock_screen_show_team_name?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_lock_screen_actions?: boolean | null
          lock_screen_show_player_name?: boolean | null
          lock_screen_show_team_name?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workout_template_days: {
        Row: {
          created_at: string | null
          day_of_week: number
          id: string
          notes: string | null
          title: string | null
          workout_template_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          id?: string
          notes?: string | null
          title?: string | null
          workout_template_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          id?: string
          notes?: string | null
          title?: string | null
          workout_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_days_workout_template_id_fkey"
            columns: ["workout_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_template_tasks: {
        Row: {
          created_at: string | null
          id: string
          is_required: boolean | null
          label: string
          shot_type: string | null
          shots_expected: number | null
          sort_order: number
          target_type: string | null
          target_value: number | null
          task_type: string
          workout_template_day_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          label: string
          shot_type?: string | null
          shots_expected?: number | null
          sort_order: number
          target_type?: string | null
          target_value?: number | null
          task_type: string
          workout_template_day_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          label?: string
          shot_type?: string | null
          shots_expected?: number | null
          sort_order?: number
          target_type?: string | null
          target_value?: number | null
          task_type?: string
          workout_template_day_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_tasks_workout_template_day_id_fkey"
            columns: ["workout_template_day_id"]
            isOneToOne: false
            referencedRelation: "workout_template_days"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          created_at: string | null
          created_by_user_id: string
          description: string | null
          id: string
          name: string
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_user_id: string
          description?: string | null
          id?: string
          name: string
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string
          description?: string | null
          id?: string
          name?: string
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_offline_event: {
        Args: {
          p_event_type: string
          p_local_event_id: string
          p_payload: Json
        }
        Returns: Json
      }
      apply_quick_action: {
        Args: {
          p_action_type: string
          p_local_event_id: string
          p_player_id: string
        }
        Returns: Json
      }
      calculate_goal_progress: { Args: { p_goal_id: string }; Returns: Json }
      check_and_enable_game_days: { Args: never; Returns: undefined }
      evaluate_player_challenges: {
        Args: { p_player_id: string }
        Returns: Json
      }
      get_team_dashboard_snapshot: {
        Args: { p_team_id: string }
        Returns: Json
      }
      get_today_snapshot: { Args: { p_player_id: string }; Returns: Json }
      is_guardian_of_team_player: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      is_player_guardian: {
        Args: { player_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_player_owner: {
        Args: { player_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_player_team_member: {
        Args: { p_player_id: string; p_team_id: string }
        Returns: boolean
      }
      is_team_adult: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_team_head_coach: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: boolean
      }
      join_team_with_invite: {
        Args: { invite_token: string; p_player_id: string }
        Returns: Json
      }
      preview_team_by_invite: { Args: { invite_token: string }; Returns: Json }
      redeem_guardian_invite: { Args: { invite_token: string }; Returns: Json }
      redeem_team_adult_invite: {
        Args: { invite_token: string }
        Returns: Json
      }
      regenerate_team_invite: { Args: { p_team_id: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
