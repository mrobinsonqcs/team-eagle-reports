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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: AppRole;
      newsletter_status: NewsletterStatus;
    };
  };
}
