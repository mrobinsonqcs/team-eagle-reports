export type AppRole = 'division' | 'admin' | 'dealer';

export type NewsletterStatus = 'draft' | 'ready' | 'sent' | 'skipped';

export interface Database {
  public: {
    Tables: {
      offices: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          office_id: string | null;
          marketing_director_name: string | null;
          active: boolean;
          must_change_password: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          office_id?: string | null;
          marketing_director_name?: string | null;
          active?: boolean;
          must_change_password?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          office_id?: string | null;
          marketing_director_name?: string | null;
          active?: boolean;
          must_change_password?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: AppRole;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: AppRole;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: AppRole;
        };
        Relationships: [];
      };
      safety_advisors: {
        Row: {
          id: string;
          office_id: string;
          full_name: string;
          active: boolean;
          rookie_until: string | null;
        };
        Insert: {
          id?: string;
          office_id: string;
          full_name: string;
          active?: boolean;
          rookie_until?: string | null;
        };
        Update: {
          id?: string;
          office_id?: string;
          full_name?: string;
          active?: boolean;
          rookie_until?: string | null;
        };
        Relationships: [];
      };
      weekly_reports: {
        Row: {
          id: string;
          office_id: string;
          submitted_by: string | null;
          last_edited_by: string | null;
          last_edited_at: string | null;
          week_ending_date: string;
          marketing_director_name: string | null;
          office_appointments_set: number;
          recruits_in_training: number;
          qualified_recruits: number;
          appointments_set: number;
          demos_ran: number;
          total_units: number;
          net_installed_protections: number;
          notes: string | null;
          submitted_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          office_id: string;
          submitted_by?: string | null;
          last_edited_by?: string | null;
          last_edited_at?: string | null;
          week_ending_date: string;
          marketing_director_name?: string | null;
          office_appointments_set?: number;
          recruits_in_training?: number;
          qualified_recruits?: number;
          appointments_set?: number;
          demos_ran?: number;
          total_units?: number;
          net_installed_protections?: number;
          notes?: string | null;
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          office_id?: string;
          submitted_by?: string | null;
          last_edited_by?: string | null;
          last_edited_at?: string | null;
          week_ending_date?: string;
          marketing_director_name?: string | null;
          office_appointments_set?: number;
          recruits_in_training?: number;
          qualified_recruits?: number;
          appointments_set?: number;
          demos_ran?: number;
          total_units?: number;
          net_installed_protections?: number;
          notes?: string | null;
          submitted_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      weekly_report_sa_breakdown: {
        Row: {
          id: string;
          weekly_report_id: string;
          safety_advisor_id: string;
          appointments_set: number;
          demos_ran: number;
          total_units: number;
          net_installed_protections: number;
        };
        Insert: {
          id?: string;
          weekly_report_id: string;
          safety_advisor_id: string;
          appointments_set?: number;
          demos_ran?: number;
          total_units?: number;
          net_installed_protections?: number;
        };
        Update: {
          id?: string;
          weekly_report_id?: string;
          safety_advisor_id?: string;
          appointments_set?: number;
          demos_ran?: number;
          total_units?: number;
          net_installed_protections?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_rookie_season_end: {
        Args: { _today?: string };
        Returns: string;
      };
      get_user_last_sign_ins: {
        Args: { _user_ids: string[] };
        Returns: { id: string; last_sign_in_at: string | null }[];
      };
    };
    Enums: {
      app_role: AppRole;
      newsletter_status: NewsletterStatus;
    };
  };
}
