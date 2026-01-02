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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          description: string
          icon: string | null
          id: string
          name: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description: string
          icon?: string | null
          id?: string
          name: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string | null
          id?: string
          name?: string
          xp_reward?: number
        }
        Relationships: []
      }
      billing_records: {
        Row: {
          amount: number
          description: string
          id: string
          paid_at: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          description: string
          id?: string
          paid_at?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          description?: string
          id?: string
          paid_at?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          completed_at: string
          exam_id: string
          id: string
          mode: Database["public"]["Enums"]["exam_mode"]
          score: number
          time_taken: number | null
          total_questions: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          exam_id: string
          id?: string
          mode: Database["public"]["Enums"]["exam_mode"]
          score: number
          time_taken?: number | null
          total_questions: number
          user_id: string
        }
        Update: {
          completed_at?: string
          exam_id?: string
          id?: string
          mode?: Database["public"]["Enums"]["exam_mode"]
          score?: number
          time_taken?: number | null
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          avg_score: number
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation_pdf_url: string | null
          id: string
          is_free: boolean
          level: Database["public"]["Enums"]["education_level"]
          pdf_summary: string | null
          question_count: number
          subject: string
          time_limit: number
          title: string
          topic: string | null
          type: Database["public"]["Enums"]["exam_type"]
          updated_at: string
          year: number
        }
        Insert: {
          avg_score?: number
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation_pdf_url?: string | null
          id?: string
          is_free?: boolean
          level: Database["public"]["Enums"]["education_level"]
          pdf_summary?: string | null
          question_count?: number
          subject: string
          time_limit: number
          title: string
          topic?: string | null
          type: Database["public"]["Enums"]["exam_type"]
          updated_at?: string
          year: number
        }
        Update: {
          avg_score?: number
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation_pdf_url?: string | null
          id?: string
          is_free?: boolean
          level?: Database["public"]["Enums"]["education_level"]
          pdf_summary?: string | null
          question_count?: number
          subject?: string
          time_limit?: number
          title?: string
          topic?: string | null
          type?: Database["public"]["Enums"]["exam_type"]
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      link_requests: {
        Row: {
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["link_status"]
          target_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["link_status"]
          target_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["link_status"]
          target_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_requests_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      linked_accounts: {
        Row: {
          id: string
          linked_at: string
          parent_or_school_id: string
          student_id: string
        }
        Insert: {
          id?: string
          linked_at?: string
          parent_or_school_id: string
          student_id: string
        }
        Update: {
          id?: string
          linked_at?: string
          parent_or_school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "linked_accounts_parent_or_school_id_fkey"
            columns: ["parent_or_school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linked_accounts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          read: boolean
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          read?: boolean
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          read?: boolean
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          contact_person: string | null
          created_at: string
          dob: string | null
          email: string
          id: string
          level: Database["public"]["Enums"]["education_level"] | null
          name: string
          phone: string | null
          school: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          contact_person?: string | null
          created_at?: string
          dob?: string | null
          email: string
          id: string
          level?: Database["public"]["Enums"]["education_level"] | null
          name: string
          phone?: string | null
          school?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          contact_person?: string | null
          created_at?: string
          dob?: string | null
          email?: string
          id?: string
          level?: Database["public"]["Enums"]["education_level"] | null
          name?: string
          phone?: string | null
          school?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      question_history: {
        Row: {
          exam_id: string
          id: string
          is_correct: boolean
          last_attempt: string
          next_review: string | null
          question_part_id: string
          streak: number
          user_id: string
        }
        Insert: {
          exam_id: string
          id?: string
          is_correct: boolean
          last_attempt?: string
          next_review?: string | null
          question_part_id: string
          streak?: number
          user_id: string
        }
        Update: {
          exam_id?: string
          id?: string
          is_correct?: boolean
          last_attempt?: string
          next_review?: string | null
          question_part_id?: string
          streak?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_history_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_history_question_part_id_fkey"
            columns: ["question_part_id"]
            isOneToOne: false
            referencedRelation: "question_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      question_parts: {
        Row: {
          answer: string
          answer_type: Database["public"]["Enums"]["answer_type"]
          created_at: string
          explanation: string | null
          id: string
          marks: number
          order_index: number
          question_id: string
          text: string
        }
        Insert: {
          answer: string
          answer_type?: Database["public"]["Enums"]["answer_type"]
          created_at?: string
          explanation?: string | null
          id?: string
          marks?: number
          order_index?: number
          question_id: string
          text: string
        }
        Update: {
          answer?: string
          answer_type?: Database["public"]["Enums"]["answer_type"]
          created_at?: string
          explanation?: string | null
          id?: string
          marks?: number
          order_index?: number
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_parts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          image_url: string | null
          question_number: number
          table_data: Json | null
          text: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          image_url?: string | null
          question_number: number
          table_data?: Json | null
          text: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          image_url?: string | null
          question_number?: number
          table_data?: Json | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      study_reminders: {
        Row: {
          active: boolean
          created_at: string
          id: string
          reminder_time: string
          subject: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          reminder_time: string
          subject: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          reminder_time?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string | null
          created_at: string
          expires_at: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          starts_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          starts_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          starts_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          created_at: string
          id: string
          last_exam_date: string | null
          streak: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_exam_date?: string | null
          streak?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_exam_date?: string | null
          streak?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_premium: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_standard: { Args: { _user_id: string }; Returns: boolean }
      is_linked_to: {
        Args: { _parent_or_school_id: string; _student_id: string }
        Returns: boolean
      }
    }
    Enums: {
      answer_type: "text" | "numeric" | "open-ended"
      app_role: "student" | "parent" | "school" | "admin"
      difficulty_level: "Easy" | "Medium" | "Hard"
      education_level: "PLE" | "UCE" | "UACE"
      exam_mode: "practice" | "simulation"
      exam_type: "Past Paper" | "Practice Paper"
      link_status: "pending" | "accepted" | "rejected"
      subscription_plan: "Free" | "Premium"
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
    Enums: {
      answer_type: ["text", "numeric", "open-ended"],
      app_role: ["student", "parent", "school", "admin"],
      difficulty_level: ["Easy", "Medium", "Hard"],
      education_level: ["PLE", "UCE", "UACE"],
      exam_mode: ["practice", "simulation"],
      exam_type: ["Past Paper", "Practice Paper"],
      link_status: ["pending", "accepted", "rejected"],
      subscription_plan: ["Free", "Premium"],
    },
  },
} as const
