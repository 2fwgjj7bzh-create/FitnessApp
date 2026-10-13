// Types générés manuellement — remplace par `supabase gen types typescript` une fois les credentials configurés

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          pseudo: string | null;
          niveau: 'débutant' | 'intermédiaire' | 'avancé' | null;
          unite: 'kg' | 'lbs';
          date_inscription: string;
          first_name: string | null;
          age: number | null;
          gender: 'male' | 'female' | null;
          height_cm: number | null;
          weight_kg: number | null;
          goal: 'lose' | 'maintain' | 'gain' | null;
          activity_level: string | null;
          settings: Record<string, unknown>;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      ebooks: {
        Row: {
          id: string;
          titre: string;
          type: 'powerbuilding' | 'bodybuilding';
          description: string | null;
          prix_stripe_id: string | null;
          couverture_url: string | null;
          pdf_url: string | null;
          niveau_cible: 'débutant' | 'intermédiaire' | 'avancé' | 'tous' | null;
          duree_semaines: number | null;
          frequence_hebdo: number | null;
          is_published: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ebooks']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['ebooks']['Row']>;
      };
      user_entitlements: {
        Row: {
          id: string;
          user_id: string;
          ebook_id: string;
          date_achat: string;
          source: 'stripe' | 'offert' | 'coaching';
          stripe_session_id: string | null;
        };
        Insert: Omit<Database['public']['Tables']['user_entitlements']['Row'], 'id' | 'date_achat'> & { id?: string; date_achat?: string };
        Update: Partial<Database['public']['Tables']['user_entitlements']['Row']>;
      };
      programs: {
        Row: {
          id: string;
          ebook_id: string;
          nom: string;
          objectif: string | null;
          duree_semaines: number | null;
          frequence_hebdo: number | null;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['programs']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['programs']['Row']>;
      };
      program_weeks: {
        Row: {
          id: string;
          program_id: string;
          numero_semaine: number;
          note: string | null;
        };
        Insert: Omit<Database['public']['Tables']['program_weeks']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['program_weeks']['Row']>;
      };
      program_days: {
        Row: {
          id: string;
          program_week_id: string;
          numero_jour: number;
          nom: string;
        };
        Insert: Omit<Database['public']['Tables']['program_days']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['program_days']['Row']>;
      };
      program_sets: {
        Row: {
          id: string;
          program_day_id: string;
          exercise_id: string;
          ordre: number;
          type_set: 'warmup' | 'normal' | 'dropset' | 'failure';
          reps_cible: number | null;
          rep_range: string | null;
          charge_cible: number | null;
          pourcentage_1rm: number | null;
          rpe_cible: number | null;
          superset_group: string | null;
          note: string | null;
        };
        Insert: Omit<Database['public']['Tables']['program_sets']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['program_sets']['Row']>;
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          program_day_id: string | null;
          date: string;
          duree: number | null;
          note: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['workouts']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['workouts']['Row']>;
      };
      logged_sets: {
        Row: {
          id: string;
          workout_id: string;
          exercise_id: string | null;
          exercise_nom: string;
          ordre: number;
          type_set: 'warmup' | 'normal' | 'dropset' | 'failure';
          reps: number | null;
          charge: number | null;
          rpe: number | null;
          is_pr: boolean;
          completed: boolean;
          note: string | null;
        };
        Insert: Omit<Database['public']['Tables']['logged_sets']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['logged_sets']['Row']>;
      };
      body_measurements: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          poids_corps: number | null;
          mensurations: Record<string, number>;
          feeling: 1 | 2 | 3 | 4 | 5 | null;
          sleep_hours: number | null;
          sleep_quality: 1 | 2 | 3 | 4 | 5 | null;
          notes: string | null;
          photo_url: string | null;
        };
        Insert: Omit<Database['public']['Tables']['body_measurements']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['body_measurements']['Row']>;
      };
      personal_records: {
        Row: {
          id: string;
          user_id: string;
          exercise_nom: string;
          record_type: '1rm_estimated' | '1rm_actual' | 'max_reps' | 'max_volume';
          value: number;
          achieved_at: string;
          workout_id: string | null;
        };
        Insert: Omit<Database['public']['Tables']['personal_records']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['personal_records']['Row']>;
      };
      user_goals: {
        Row: {
          user_id: string;
          workouts_per_week: number;
          calorie_goal: number;
          protein_goal: number;
          carbs_goal: number;
          fat_goal: number;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['user_goals']['Row']> & { user_id: string };
        Update: Partial<Database['public']['Tables']['user_goals']['Row']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
