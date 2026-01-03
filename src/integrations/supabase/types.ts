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
          player_id: string
          practice_card_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          player_id: string
          practice_card_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          player_id?: string
          practice_card_id?: string
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
      task_completions: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          completed_by: string | null
          id: string
          player_id: string
          practice_task_id: string
          shots_logged: number | null
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          player_id: string
          practice_task_id: string
          shots_logged?: number | null
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          player_id?: string
          practice_task_id?: string
          shots_logged?: number | null
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
      teams: {
        Row: {
          created_at: string | null
          created_by_user_id: string
          id: string
          name: string
          palette_id: string
          season_label: string | null
          team_logo_url: string | null
          team_photo_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_user_id: string
          id?: string
          name: string
          palette_id?: string
          season_label?: string | null
          team_logo_url?: string | null
          team_photo_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string
          id?: string
          name?: string
          palette_id?: string
          season_label?: string | null
          team_logo_url?: string | null
          team_photo_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
