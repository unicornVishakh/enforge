/**
 * Hand-rolled Supabase Database types — matches supabase/migrations/0001_init.sql.
 *
 * To regenerate from a real Supabase project once you've run the migration:
 *   pnpm dlx supabase gen types typescript --project-id <ref> --schema public \
 *     > src/lib/types/database.ts
 *
 * The shape below intentionally matches what `supabase gen types` would emit,
 * so a regenerate is a drop-in replacement.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "researcher" | "admin";
export type WorkspaceRole = "owner" | "editor" | "viewer";
export type CandidateSource = "db" | "generated";
export type CommentEntity = "candidate" | "experiment" | "pathway";

export interface Mutation {
  position: number;
  from: string;
  to: string;
  score?: number;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workspaces"]["Insert"]>;
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: WorkspaceRole;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workspace_members"]["Insert"]>;
      };
      projects: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          target_reaction: string | null;
          substrate: string | null;
          product: string | null;
          conditions: Json;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          target_reaction?: string | null;
          substrate?: string | null;
          product?: string | null;
          conditions?: Json;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
      };
      enzyme_candidates: {
        Row: {
          id: string;
          project_id: string;
          source: CandidateSource;
          source_id: string | null;
          name: string;
          sequence: string;
          parent_sequence: string | null;
          parent_id: string | null;
          mutations: Mutation[];
          ec_number: string | null;
          organism: string | null;
          pdb_id: string | null;
          embedding: number[] | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          source: CandidateSource;
          source_id?: string | null;
          name: string;
          sequence: string;
          parent_sequence?: string | null;
          parent_id?: string | null;
          mutations?: Mutation[];
          ec_number?: string | null;
          organism?: string | null;
          pdb_id?: string | null;
          embedding?: number[] | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["enzyme_candidates"]["Insert"]>;
      };
      predictions: {
        Row: {
          id: string;
          candidate_id: string;
          model_version: string;
          activity_score: number;
          stability_score: number;
          expression_score: number;
          predicted_yield: number;
          confidence_lower: number;
          confidence_upper: number;
          features: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          model_version: string;
          activity_score: number;
          stability_score: number;
          expression_score: number;
          predicted_yield: number;
          confidence_lower: number;
          confidence_upper: number;
          features?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["predictions"]["Insert"]>;
      };
      pathway_designs: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          graph: Json;
          predicted_flux: number | null;
          bottlenecks: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          graph: Json;
          predicted_flux?: number | null;
          bottlenecks?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pathway_designs"]["Insert"]>;
      };
      experiments: {
        Row: {
          id: string;
          candidate_id: string;
          performed_by: string;
          performed_at: string;
          measured_activity: number | null;
          measured_stability: number | null;
          measured_yield: number | null;
          notes: string | null;
          attachments: Json;
          prediction_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          performed_by: string;
          performed_at?: string;
          measured_activity?: number | null;
          measured_stability?: number | null;
          measured_yield?: number | null;
          notes?: string | null;
          attachments?: Json;
          prediction_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["experiments"]["Insert"]>;
      };
      model_calibration: {
        Row: {
          id: string;
          model_version: string;
          n_observations: number;
          mae_activity: number | null;
          mae_stability: number | null;
          mae_yield: number | null;
          calibration_params: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          model_version: string;
          n_observations: number;
          mae_activity?: number | null;
          mae_stability?: number | null;
          mae_yield?: number | null;
          calibration_params?: Json;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["model_calibration"]["Insert"]>;
      };
      comments: {
        Row: {
          id: string;
          entity_type: CommentEntity;
          entity_id: string;
          parent_id: string | null;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type: CommentEntity;
          entity_id: string;
          parent_id?: string | null;
          user_id: string;
          body: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["comments"]["Insert"]>;
      };
      audit_log: {
        Row: {
          id: string;
          user_id: string | null;
          workspace_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          workspace_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
      };
      retrieval_cache: {
        Row: {
          id: string;
          cache_key: string;
          source: string;
          payload: Json;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cache_key: string;
          source: string;
          payload: Json;
          expires_at: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["retrieval_cache"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      workspace_role_of: {
        Args: { ws_id: string };
        Returns: WorkspaceRole | null;
      };
      is_workspace_member: {
        Args: { ws_id: string };
        Returns: boolean;
      };
      can_edit_workspace: {
        Args: { ws_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      workspace_role: WorkspaceRole;
      candidate_source: CandidateSource;
      comment_entity: CommentEntity;
    };
  };
}

// Convenience aliases.
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type WorkspaceMember = Database["public"]["Tables"]["workspace_members"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type EnzymeCandidate = Database["public"]["Tables"]["enzyme_candidates"]["Row"];
export type Prediction = Database["public"]["Tables"]["predictions"]["Row"];
export type PathwayDesign = Database["public"]["Tables"]["pathway_designs"]["Row"];
export type Experiment = Database["public"]["Tables"]["experiments"]["Row"];
export type ModelCalibration = Database["public"]["Tables"]["model_calibration"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_log"]["Row"];
