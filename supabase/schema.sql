-- ─────────────────────────────────────────────────────────
-- SensoryNest — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────

-- Profiles (one per user, auto-created on sign-up)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  child_name text,
  child_age integer,
  child_notes text,
  ot_name text,
  ot_email text,
  ot_next_session date,
  expo_push_token text,
  reminders_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Activities (library + personal)
create table public.activities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  sensory_system text not null,
  source text check (source in ('ot', 'library', 'my')) default 'my',
  duration integer not null default 10,
  is_library boolean default false,
  created_at timestamptz default now()
);

-- Scheduled activities (today's diet)
create table public.scheduled_activities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  activity_id uuid references public.activities on delete cascade not null,
  scheduled_date date not null,
  scheduled_time text,
  status text check (status in ('pending', 'done', 'skipped')) default 'pending',
  sort_order integer default 0,
  ot_sort_order integer default 0,
  created_at timestamptz default now()
);

-- Goals
create table public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  progress integer default 0 check (progress >= 0 and progress <= 100),
  status text check (status in ('active', 'achieved')) default 'active',
  target_date date,
  ot_set boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Goal notes
create table public.goal_notes (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references public.goals on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  note text not null,
  created_at timestamptz default now()
);

-- ─── Row Level Security ───────────────────────────────────
alter table public.profiles enable row level security;
alter table public.activities enable row level security;
alter table public.scheduled_activities enable row level security;
alter table public.goals enable row level security;
alter table public.goal_notes enable row level security;

-- Profiles: users can only read/write their own
create policy "Users own their profile"
  on public.profiles for all
  using (auth.uid() = id);

-- Activities: users see their own + library items
create policy "Users see own and library activities"
  on public.activities for select
  using (auth.uid() = user_id or is_library = true);

create policy "Users insert own activities"
  on public.activities for insert
  with check (auth.uid() = user_id);

create policy "Users update own activities"
  on public.activities for update
  using (auth.uid() = user_id);

create policy "Users delete own activities"
  on public.activities for delete
  using (auth.uid() = user_id);

-- Scheduled activities: users only see their own
create policy "Users own scheduled activities"
  on public.scheduled_activities for all
  using (auth.uid() = user_id);

-- Goals: users only see their own
create policy "Users own goals"
  on public.goals for all
  using (auth.uid() = user_id);

-- Goal notes: users only see their own
create policy "Users own goal notes"
  on public.goal_notes for all
  using (auth.uid() = user_id);

-- ─── Auto-create profile on sign-up ──────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
