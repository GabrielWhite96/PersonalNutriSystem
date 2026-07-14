create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'activity_level') then
    create type public.activity_level as enum (
      'sedentario',
      'leve',
      'moderado',
      'intenso',
      'muito_intenso'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'goal_type') then
    create type public.goal_type as enum (
      'emagrecer',
      'manter',
      'ganhar_massa',
      'outro'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'meal_type') then
    create type public.meal_type as enum (
      'cafe_manha',
      'almoco',
      'lanche',
      'jantar',
      'outro'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'sex_type') then
    create type public.sex_type as enum (
      'masculino',
      'feminino',
      'outro'
    );
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  age integer,
  sex public.sex_type,
  height_cm numeric,
  weight_kg numeric,
  activity_level public.activity_level,
  goal public.goal_type,
  assistant_name text not null default 'Nutri',
  kcal_goal integer,
  protein_g_goal integer,
  carb_g_goal integer,
  fat_g_goal integer,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_type public.meal_type not null default 'outro',
  title text not null,
  items jsonb not null default '[]'::jsonb,
  kcal numeric not null default 0,
  protein_g numeric not null default 0,
  carb_g numeric not null default 0,
  fat_g numeric not null default 0,
  original_message text,
  eaten_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_food_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  summary text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  weight_kg numeric not null,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists user_food_preferences_user_id_key_idx
  on public.user_food_preferences (user_id, key);

create index if not exists meals_user_id_eaten_at_idx
  on public.meals (user_id, eaten_at desc);

create index if not exists chat_messages_user_id_created_at_idx
  on public.chat_messages (user_id, created_at asc);

create index if not exists weight_logs_user_id_logged_at_idx
  on public.weight_logs (user_id, logged_at asc);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_meals_updated_at on public.meals;
create trigger set_meals_updated_at
before update on public.meals
for each row
execute function public.set_updated_at();

drop trigger if exists set_user_food_preferences_updated_at on public.user_food_preferences;
create trigger set_user_food_preferences_updated_at
before update on public.user_food_preferences
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.meals enable row level security;
alter table public.chat_messages enable row level security;
alter table public.user_food_preferences enable row level security;
alter table public.weight_logs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "meals_select_own" on public.meals;
create policy "meals_select_own" on public.meals for select to authenticated using (auth.uid() = user_id);
drop policy if exists "meals_insert_own" on public.meals;
create policy "meals_insert_own" on public.meals for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "meals_update_own" on public.meals;
create policy "meals_update_own" on public.meals for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "meals_delete_own" on public.meals;
create policy "meals_delete_own" on public.meals for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "chat_messages_select_own" on public.chat_messages;
create policy "chat_messages_select_own" on public.chat_messages for select to authenticated using (auth.uid() = user_id);
drop policy if exists "chat_messages_insert_own" on public.chat_messages;
create policy "chat_messages_insert_own" on public.chat_messages for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "chat_messages_delete_own" on public.chat_messages;
create policy "chat_messages_delete_own" on public.chat_messages for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "prefs_select_own" on public.user_food_preferences;
create policy "prefs_select_own" on public.user_food_preferences for select to authenticated using (auth.uid() = user_id);
drop policy if exists "prefs_insert_own" on public.user_food_preferences;
create policy "prefs_insert_own" on public.user_food_preferences for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "prefs_update_own" on public.user_food_preferences;
create policy "prefs_update_own" on public.user_food_preferences for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "prefs_delete_own" on public.user_food_preferences;
create policy "prefs_delete_own" on public.user_food_preferences for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "weight_logs_select_own" on public.weight_logs;
create policy "weight_logs_select_own" on public.weight_logs for select to authenticated using (auth.uid() = user_id);
drop policy if exists "weight_logs_insert_own" on public.weight_logs;
create policy "weight_logs_insert_own" on public.weight_logs for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "weight_logs_delete_own" on public.weight_logs;
create policy "weight_logs_delete_own" on public.weight_logs for delete to authenticated using (auth.uid() = user_id);
