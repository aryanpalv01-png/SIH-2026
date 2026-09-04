-- ==============================================================================
-- VeriScan Master Database Schema (Supabase / PostgreSQL)
-- Architecture: Multi-layered document authenticity screening
-- Based on: Part 4 of Master Build Document & Microservices Flow
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. ENUMS
do $$ begin
  create type public.user_role as enum ('individual', 'org_admin', 'org_reviewer');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.document_type_enum as enum ('aadhaar', 'pan', 'passport', 'marksheet', 'bank_statement', 'other');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.document_status_enum as enum ('processing', 'verified', 'needs_review', 'likely_forged');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.check_result_enum as enum ('pass', 'flag', 'not_applicable');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.review_status_enum as enum ('pending', 'in_progress', 'completed');
exception
  when duplicate_object then null;
end $$;

-- 2. USERS TABLE
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  organization_name text,
  role public.user_role not null default 'individual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. DOCUMENTS TABLE
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  file_path text not null,
  file_url text not null,
  document_type public.document_type_enum not null default 'other',
  original_filename text not null,
  mime_type text not null default 'image/jpeg',
  file_size integer not null default 0,
  uploaded_at timestamptz not null default now(),
  status public.document_status_enum not null default 'processing',
  confidence_score integer not null default 0 check (confidence_score between 0 and 100),
  checks jsonb not null default '[]'::jsonb,
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. CHECKS TABLE (Normalized granular record per forensic module)
create table if not exists public.checks (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references public.documents(id) on delete cascade,
  check_name text not null,
  result public.check_result_enum not null default 'not_applicable',
  confidence integer not null default 0 check (confidence between 0 and 100),
  explanation text not null default '',
  flagged_region jsonb,
  provider text not null default 'local',
  created_at timestamptz not null default now()
);

-- 5. REVIEWS TABLE (Human-in-the-loop review workflow)
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references public.documents(id) on delete cascade,
  reviewer_id uuid references public.users(id) on delete set null,
  status public.review_status_enum not null default 'pending',
  reviewer_notes text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- 6. API KEYS TABLE (Organizational developer access)
create table if not exists public.api_keys (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key_hash text not null unique,
  label text not null default 'Default API Key',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- 7. STORAGE BUCKET CONFIGURATION
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- 8. ROW LEVEL SECURITY (RLS)
alter table public.users enable row level security;
alter table public.documents enable row level security;
alter table public.checks enable row level security;
alter table public.reviews enable row level security;
alter table public.api_keys enable row level security;

-- Documents RLS Policies: users see own; org reviewers/admins see org docs
create policy "users can view own documents"
  on public.documents for select to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own documents"
  on public.documents for insert to authenticated
  with check (auth.uid() = user_id);

create policy "users can update own documents"
  on public.documents for update to authenticated
  using (auth.uid() = user_id);

-- Storage RLS Policies: private documents bucket
create policy "authenticated users upload to documents bucket"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "authenticated users read their own stored documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- Checks RLS Policies
create policy "users can view checks for own documents"
  on public.checks for select to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = checks.document_id and d.user_id = auth.uid()
    )
  );

-- Reviews RLS Policies
create policy "users can view reviews for own documents"
  on public.reviews for select to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = reviews.document_id and d.user_id = auth.uid()
    )
  );

-- 9. REALTIME PUBLICATION
-- Enables Realtime Sync for Client App as shown in architecture diagram
alter publication supabase_realtime add table public.documents;

-- 10. DATABASE WEBHOOK TRIGGER INSTRUCTIONS (FOR N8N / MICROSERVICE)
-- In Supabase dashboard:
-- 1. Navigate to: Database > Webhooks > Create webhook
-- 2. Name: veriscan_orchestration_webhook
-- 3. Table: public.documents, Events: INSERT, Method: POST
-- 4. Target URL: https://<your-n8n-domain>/webhook/veriscan-doc-uploaded OR https://<forensic-worker-host>/webhook/supabase
-- 5. Headers: Content-Type: application/json
