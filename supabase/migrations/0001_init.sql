-- ============================================================================
-- EnzymeForge.ai — Initial schema (0001_init.sql)
-- ----------------------------------------------------------------------------
-- Run this in your Supabase project: Database → SQL Editor → paste → Run.
--
-- Notes on pgvector (Supabase enables it by default on Postgres 15+):
--   The `enzyme_candidates.embedding` column is `vector(320)` because the
--   ESM-2 small model (facebook/esm2_t6_8M_UR50D) emits 320-dim embeddings.
--   If your project does not have pgvector available, change the column to
--   `jsonb` (a JSON array of 320 floats); the application code accepts both
--   shapes via the type system. Search for `--PGVECTOR FALLBACK` below.
-- ============================================================================

-- ─── Extensions ─────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists vector;  --PGVECTOR: drop this line if unavailable

-- ─── Enums ──────────────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('researcher', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type workspace_role as enum ('owner', 'editor', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type candidate_source as enum ('db', 'generated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type comment_entity as enum ('candidate', 'experiment', 'pathway');
exception when duplicate_object then null; end $$;

-- ─── Tables ─────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        user_role not null default 'researcher',
  created_at  timestamptz not null default now()
);

create table if not exists public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists workspaces_owner_idx on public.workspaces(owner_id);

create table if not exists public.workspace_members (
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role          workspace_role not null default 'viewer',
  created_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index if not exists workspace_members_user_idx on public.workspace_members(user_id);

create table if not exists public.projects (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  name            text not null,
  target_reaction text,
  substrate       text,
  product         text,
  conditions      jsonb not null default '{}'::jsonb,
  created_by      uuid not null references public.profiles(id) on delete restrict,
  created_at      timestamptz not null default now()
);
create index if not exists projects_workspace_idx on public.projects(workspace_id);

create table if not exists public.enzyme_candidates (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  source          candidate_source not null,
  source_id       text,
  name            text not null,
  sequence        text not null,
  parent_sequence text,
  parent_id       uuid references public.enzyme_candidates(id) on delete set null,
  mutations       jsonb not null default '[]'::jsonb,
  ec_number       text,
  organism        text,
  pdb_id          text,
  -- 320 dims = ESM-2 small (facebook/esm2_t6_8M_UR50D) hidden size --PGVECTOR FALLBACK: change to jsonb if pgvector unavailable
  embedding       vector(320),
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists enzyme_candidates_project_idx on public.enzyme_candidates(project_id);
create index if not exists enzyme_candidates_source_idx on public.enzyme_candidates(source);
create index if not exists enzyme_candidates_parent_idx on public.enzyme_candidates(parent_id);

create table if not exists public.predictions (
  id                 uuid primary key default gen_random_uuid(),
  candidate_id       uuid not null references public.enzyme_candidates(id) on delete cascade,
  model_version      text not null,
  activity_score     double precision not null,
  stability_score    double precision not null,
  expression_score   double precision not null,
  predicted_yield    double precision not null,
  confidence_lower   double precision not null,
  confidence_upper   double precision not null,
  features           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);
create index if not exists predictions_candidate_idx on public.predictions(candidate_id);
create index if not exists predictions_yield_idx on public.predictions(predicted_yield desc);

create table if not exists public.pathway_designs (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  name            text not null,
  graph           jsonb not null,
  predicted_flux  double precision,
  bottlenecks     jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists pathway_designs_project_idx on public.pathway_designs(project_id);

create table if not exists public.experiments (
  id                  uuid primary key default gen_random_uuid(),
  candidate_id        uuid not null references public.enzyme_candidates(id) on delete cascade,
  performed_by        uuid not null references public.profiles(id) on delete restrict,
  performed_at        timestamptz not null default now(),
  measured_activity   double precision,
  measured_stability  double precision,
  measured_yield      double precision,
  notes               text,
  attachments         jsonb not null default '[]'::jsonb,
  prediction_id       uuid references public.predictions(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists experiments_candidate_idx on public.experiments(candidate_id);

create table if not exists public.model_calibration (
  id                  uuid primary key default gen_random_uuid(),
  model_version       text not null unique,
  n_observations      int not null,
  mae_activity        double precision,
  mae_stability       double precision,
  mae_yield           double precision,
  calibration_params  jsonb not null default '{}'::jsonb,
  updated_at          timestamptz not null default now()
);

create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  entity_type  comment_entity not null,
  entity_id    uuid not null,
  parent_id    uuid references public.comments(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  body         text not null,
  created_at   timestamptz not null default now()
);
create index if not exists comments_entity_idx on public.comments(entity_type, entity_id);

create table if not exists public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists audit_log_workspace_idx on public.audit_log(workspace_id, created_at desc);

create table if not exists public.retrieval_cache (
  id          uuid primary key default gen_random_uuid(),
  cache_key   text not null unique,
  source      text not null,
  payload     jsonb not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists retrieval_cache_expires_idx on public.retrieval_cache(expires_at);

-- ─── Helper functions for RLS ───────────────────────────────────────────────
-- Returns the caller's role within a workspace (or null if not a member).
create or replace function public.workspace_role_of(ws_id uuid)
returns workspace_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.workspace_members
  where workspace_id = ws_id and user_id = auth.uid()
  limit 1;
$$;

-- Convenience: is the caller at least a viewer?
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

-- Convenience: is the caller at least an editor?
create or replace function public.can_edit_workspace(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role in ('owner', 'editor')
  );
$$;

-- Convenience: workspace_id of a project
create or replace function public.project_workspace(p_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id from public.projects where id = p_id;
$$;

-- Convenience: workspace_id of a candidate's project
create or replace function public.candidate_workspace(c_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.workspace_id
  from public.enzyme_candidates c
  join public.projects p on p.id = c.project_id
  where c.id = c_id;
$$;

-- ─── Row Level Security ─────────────────────────────────────────────────────
alter table public.profiles            enable row level security;
alter table public.workspaces          enable row level security;
alter table public.workspace_members   enable row level security;
alter table public.projects            enable row level security;
alter table public.enzyme_candidates   enable row level security;
alter table public.predictions         enable row level security;
alter table public.pathway_designs     enable row level security;
alter table public.experiments         enable row level security;
alter table public.model_calibration   enable row level security;
alter table public.comments            enable row level security;
alter table public.audit_log           enable row level security;
alter table public.retrieval_cache     enable row level security;

-- profiles: each user sees themselves + members of any shared workspace
create policy "profiles: self read" on public.profiles
  for select using (id = auth.uid());

create policy "profiles: shared-workspace read" on public.profiles
  for select using (
    exists (
      select 1
      from public.workspace_members me
      join public.workspace_members them
        on me.workspace_id = them.workspace_id
      where me.user_id = auth.uid() and them.user_id = profiles.id
    )
  );

create policy "profiles: self update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- workspaces: members can read; owner/editor can update; only authed users can create
create policy "workspaces: member read" on public.workspaces
  for select using (public.is_workspace_member(id));

create policy "workspaces: owner manage" on public.workspaces
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "workspaces: insert by anyone authed" on public.workspaces
  for insert with check (auth.uid() is not null and owner_id = auth.uid());

create policy "workspaces: owner delete" on public.workspaces
  for delete using (owner_id = auth.uid());

-- workspace_members: members can read each other; owners manage memberships
create policy "members: read peers" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

create policy "members: owner manage" on public.workspace_members
  for all using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_members.workspace_id and w.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_members.workspace_id and w.owner_id = auth.uid()
    )
  );

-- projects
create policy "projects: member read" on public.projects
  for select using (public.is_workspace_member(workspace_id));

create policy "projects: editor write" on public.projects
  for insert with check (public.can_edit_workspace(workspace_id) and created_by = auth.uid());

create policy "projects: editor update" on public.projects
  for update using (public.can_edit_workspace(workspace_id));

create policy "projects: editor delete" on public.projects
  for delete using (public.can_edit_workspace(workspace_id));

-- enzyme_candidates
create policy "candidates: member read" on public.enzyme_candidates
  for select using (public.is_workspace_member(public.project_workspace(project_id)));

create policy "candidates: editor write" on public.enzyme_candidates
  for insert with check (public.can_edit_workspace(public.project_workspace(project_id)));

create policy "candidates: editor update" on public.enzyme_candidates
  for update using (public.can_edit_workspace(public.project_workspace(project_id)));

create policy "candidates: editor delete" on public.enzyme_candidates
  for delete using (public.can_edit_workspace(public.project_workspace(project_id)));

-- predictions
create policy "predictions: member read" on public.predictions
  for select using (public.is_workspace_member(public.candidate_workspace(candidate_id)));

create policy "predictions: editor write" on public.predictions
  for insert with check (public.can_edit_workspace(public.candidate_workspace(candidate_id)));

-- pathway_designs
create policy "pathways: member read" on public.pathway_designs
  for select using (public.is_workspace_member(public.project_workspace(project_id)));

create policy "pathways: editor write" on public.pathway_designs
  for all using (public.can_edit_workspace(public.project_workspace(project_id)))
  with check (public.can_edit_workspace(public.project_workspace(project_id)));

-- experiments
create policy "experiments: member read" on public.experiments
  for select using (public.is_workspace_member(public.candidate_workspace(candidate_id)));

create policy "experiments: editor write" on public.experiments
  for insert with check (
    public.can_edit_workspace(public.candidate_workspace(candidate_id))
    and performed_by = auth.uid()
  );

create policy "experiments: editor update" on public.experiments
  for update using (public.can_edit_workspace(public.candidate_workspace(candidate_id)));

create policy "experiments: editor delete" on public.experiments
  for delete using (public.can_edit_workspace(public.candidate_workspace(candidate_id)));

-- model_calibration: read for any authed; writes via service role only
create policy "calibration: authed read" on public.model_calibration
  for select using (auth.uid() is not null);

-- comments: workspace-scoped (resolved through entity_type)
create policy "comments: read scope" on public.comments
  for select using (
    case entity_type
      when 'candidate'  then public.is_workspace_member(public.candidate_workspace(entity_id))
      when 'experiment' then public.is_workspace_member(
        public.candidate_workspace(
          (select candidate_id from public.experiments where id = entity_id)
        )
      )
      when 'pathway' then public.is_workspace_member(
        public.project_workspace(
          (select project_id from public.pathway_designs where id = entity_id)
        )
      )
    end
  );

create policy "comments: insert by member" on public.comments
  for insert with check (
    user_id = auth.uid() and case entity_type
      when 'candidate'  then public.is_workspace_member(public.candidate_workspace(entity_id))
      when 'experiment' then public.is_workspace_member(
        public.candidate_workspace(
          (select candidate_id from public.experiments where id = entity_id)
        )
      )
      when 'pathway' then public.is_workspace_member(
        public.project_workspace(
          (select project_id from public.pathway_designs where id = entity_id)
        )
      )
    end
  );

create policy "comments: author can delete" on public.comments
  for delete using (user_id = auth.uid());

-- audit_log: workspace members can read; service role writes
create policy "audit: member read" on public.audit_log
  for select using (workspace_id is null or public.is_workspace_member(workspace_id));

-- retrieval_cache: any authed user can read; service role writes
create policy "cache: authed read" on public.retrieval_cache
  for select using (auth.uid() is not null);

-- ─── Auth signup trigger: create profile + default workspace ───────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
  display_name     text;
begin
  display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, display_name)
  on conflict (id) do nothing;

  insert into public.workspaces (name, owner_id)
  values (display_name || '''s workspace', new.id)
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Realtime ──────────────────────────────────────────────────────────────
-- Enable Supabase Realtime for tables we subscribe to.
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.predictions;
alter publication supabase_realtime add table public.experiments;

-- ─── Storage buckets ───────────────────────────────────────────────────────
-- Used for experiment attachments. Run this AFTER the migration if your
-- project's storage bucket UI hasn't already provisioned it.
insert into storage.buckets (id, name, public)
values ('experiment-attachments', 'experiment-attachments', false)
on conflict (id) do nothing;

create policy "attachments: workspace member read" on storage.objects
  for select using (
    bucket_id = 'experiment-attachments'
    and (
      -- name format: {workspace_id}/{candidate_id}/{filename}
      public.is_workspace_member((split_part(name, '/', 1))::uuid)
    )
  );

create policy "attachments: workspace editor write" on storage.objects
  for insert with check (
    bucket_id = 'experiment-attachments'
    and public.can_edit_workspace((split_part(name, '/', 1))::uuid)
  );
