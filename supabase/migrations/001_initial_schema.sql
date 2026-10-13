-- ============================================================
-- Migration 001 — Schéma initial FitnessApp
-- À exécuter dans : Supabase > SQL Editor
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  pseudo      text,
  niveau      text check (niveau in ('débutant', 'intermédiaire', 'avancé')) default 'débutant',
  unite       text check (unite in ('kg', 'lbs')) default 'kg',
  date_inscription timestamptz default now(),
  -- Données locales migrées
  first_name  text,
  age         int,
  gender      text check (gender in ('male', 'female')),
  height_cm   numeric,
  weight_kg   numeric,
  goal        text check (goal in ('lose', 'maintain', 'gain')),
  activity_level text,
  settings    jsonb default '{}'::jsonb
);

alter table public.profiles enable row level security;
create policy "Utilisateur voit son profil"   on public.profiles for select using (auth.uid() = id);
create policy "Utilisateur modifie son profil" on public.profiles for update using (auth.uid() = id);
create policy "Inscription auto"               on public.profiles for insert with check (auth.uid() = id);

-- Trigger : crée le profil automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, pseudo)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── EXERCISES ────────────────────────────────────────────────────────────────
create table if not exists public.exercises (
  id           uuid primary key default uuid_generate_v4(),
  nom          text not null,
  groupe_musculaire text,
  video_url    text,
  instructions text,
  is_custom    boolean default false,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz default now()
);

alter table public.exercises enable row level security;
-- Tous peuvent lire les exos officiels ; chacun voit les siens
create policy "Lire exos officiels et persos"
  on public.exercises for select
  using (is_custom = false or created_by = auth.uid());
create policy "Créer exo perso"
  on public.exercises for insert
  with check (is_custom = true and created_by = auth.uid());
create policy "Modifier son exo perso"
  on public.exercises for update
  using (created_by = auth.uid());
create policy "Supprimer son exo perso"
  on public.exercises for delete
  using (created_by = auth.uid());

-- ─── EBOOKS ───────────────────────────────────────────────────────────────────
create table if not exists public.ebooks (
  id              uuid primary key default uuid_generate_v4(),
  titre           text not null,
  type            text check (type in ('powerbuilding', 'bodybuilding')) not null,
  description     text,
  prix_stripe_id  text,        -- Price ID Stripe (price_xxx)
  couverture_url  text,
  pdf_url         text,
  niveau_cible    text check (niveau_cible in ('débutant', 'intermédiaire', 'avancé', 'tous')),
  duree_semaines  int,
  frequence_hebdo int,
  is_published    boolean default false,
  created_at      timestamptz default now()
);

alter table public.ebooks enable row level security;
create policy "Lire ebooks publiés" on public.ebooks for select using (is_published = true);

-- ─── USER ENTITLEMENTS ────────────────────────────────────────────────────────
create table if not exists public.user_entitlements (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  ebook_id     uuid not null references public.ebooks(id) on delete cascade,
  date_achat   timestamptz default now(),
  source       text check (source in ('stripe', 'offert', 'coaching')) default 'stripe',
  stripe_session_id text,
  unique (user_id, ebook_id)
);

alter table public.user_entitlements enable row level security;
create policy "Voir ses achats" on public.user_entitlements for select using (user_id = auth.uid());
-- L'insertion se fait via webhook Stripe (service role), pas directement par l'utilisateur

-- ─── PROGRAMS ─────────────────────────────────────────────────────────────────
create table if not exists public.programs (
  id              uuid primary key default uuid_generate_v4(),
  ebook_id        uuid not null references public.ebooks(id) on delete cascade,
  nom             text not null,
  objectif        text,
  duree_semaines  int,
  frequence_hebdo int,
  description     text,
  created_at      timestamptz default now()
);

alter table public.programs enable row level security;
-- Accessible si l'utilisateur possède l'ebook parent
create policy "Voir programme si ebook possédé"
  on public.programs for select
  using (
    exists (
      select 1 from public.user_entitlements ue
      where ue.ebook_id = programs.ebook_id
        and ue.user_id = auth.uid()
    )
  );

-- ─── PROGRAM WEEKS ────────────────────────────────────────────────────────────
create table if not exists public.program_weeks (
  id             uuid primary key default uuid_generate_v4(),
  program_id     uuid not null references public.programs(id) on delete cascade,
  numero_semaine int not null,
  note           text,  -- ex: "Deload", "Intensification"
  unique (program_id, numero_semaine)
);

alter table public.program_weeks enable row level security;
create policy "Voir semaine si programme accessible"
  on public.program_weeks for select
  using (
    exists (
      select 1 from public.programs p
      join public.user_entitlements ue on ue.ebook_id = p.ebook_id
      where p.id = program_weeks.program_id
        and ue.user_id = auth.uid()
    )
  );

-- ─── PROGRAM DAYS ─────────────────────────────────────────────────────────────
create table if not exists public.program_days (
  id               uuid primary key default uuid_generate_v4(),
  program_week_id  uuid not null references public.program_weeks(id) on delete cascade,
  numero_jour      int not null,
  nom              text not null,   -- ex: "Push — Force", "Legs A"
  unique (program_week_id, numero_jour)
);

alter table public.program_days enable row level security;
create policy "Voir jour si semaine accessible"
  on public.program_days for select
  using (
    exists (
      select 1 from public.program_weeks pw
      join public.programs p on p.id = pw.program_id
      join public.user_entitlements ue on ue.ebook_id = p.ebook_id
      where pw.id = program_days.program_week_id
        and ue.user_id = auth.uid()
    )
  );

-- ─── PROGRAM SETS ─────────────────────────────────────────────────────────────
create table if not exists public.program_sets (
  id              uuid primary key default uuid_generate_v4(),
  program_day_id  uuid not null references public.program_days(id) on delete cascade,
  exercise_id     uuid not null references public.exercises(id),
  ordre           int not null,
  type_set        text check (type_set in ('warmup', 'normal', 'dropset', 'failure')) default 'normal',
  reps_cible      int,
  rep_range       text,          -- ex: "8-12"
  charge_cible    numeric,       -- poids absolu (kg)
  pourcentage_1rm numeric,       -- ex: 75.0 (= 75% du 1RM)
  rpe_cible       numeric check (rpe_cible between 1 and 10),
  superset_group  text,          -- même valeur = même superset
  note            text
);

alter table public.program_sets enable row level security;
create policy "Voir program_sets si jour accessible"
  on public.program_sets for select
  using (
    exists (
      select 1 from public.program_days pd
      join public.program_weeks pw on pw.id = pd.program_week_id
      join public.programs p on p.id = pw.program_id
      join public.user_entitlements ue on ue.ebook_id = p.ebook_id
      where pd.id = program_sets.program_day_id
        and ue.user_id = auth.uid()
    )
  );

-- ─── WORKOUTS (séances loggées) ───────────────────────────────────────────────
create table if not exists public.workouts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  program_day_id  uuid references public.program_days(id) on delete set null,
  date            date not null default current_date,
  duree           int,    -- secondes
  note            text,
  created_at      timestamptz default now()
);

alter table public.workouts enable row level security;
create policy "Voir ses séances"    on public.workouts for select using (user_id = auth.uid());
create policy "Créer séance"        on public.workouts for insert with check (user_id = auth.uid());
create policy "Modifier sa séance"  on public.workouts for update using (user_id = auth.uid());
create policy "Supprimer sa séance" on public.workouts for delete using (user_id = auth.uid());

-- ─── LOGGED SETS ─────────────────────────────────────────────────────────────
create table if not exists public.logged_sets (
  id           uuid primary key default uuid_generate_v4(),
  workout_id   uuid not null references public.workouts(id) on delete cascade,
  exercise_id  uuid references public.exercises(id) on delete set null,
  exercise_nom text not null,   -- dénormalisé pour robustesse
  ordre        int not null,
  type_set     text check (type_set in ('warmup', 'normal', 'dropset', 'failure')) default 'normal',
  reps         int,
  charge       numeric,         -- kg
  rpe          numeric check (rpe between 1 and 10),
  is_pr        boolean default false,
  completed    boolean default false,
  note         text
);

alter table public.logged_sets enable row level security;
create policy "Voir ses sets"    on public.logged_sets for select using (
  exists (select 1 from public.workouts w where w.id = logged_sets.workout_id and w.user_id = auth.uid())
);
create policy "Créer set"        on public.logged_sets for insert with check (
  exists (select 1 from public.workouts w where w.id = logged_sets.workout_id and w.user_id = auth.uid())
);
create policy "Modifier son set" on public.logged_sets for update using (
  exists (select 1 from public.workouts w where w.id = logged_sets.workout_id and w.user_id = auth.uid())
);
create policy "Supprimer son set" on public.logged_sets for delete using (
  exists (select 1 from public.workouts w where w.id = logged_sets.workout_id and w.user_id = auth.uid())
);

-- ─── BODY MEASUREMENTS ───────────────────────────────────────────────────────
create table if not exists public.body_measurements (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  date         date not null,
  poids_corps  numeric,
  mensurations jsonb default '{}'::jsonb,  -- { chest, waist, hips, leftArm, ... }
  feeling      int check (feeling between 1 and 5),
  sleep_hours  numeric,
  sleep_quality int check (sleep_quality between 1 and 5),
  notes        text,
  photo_url    text,
  unique (user_id, date)
);

alter table public.body_measurements enable row level security;
create policy "Voir ses mesures"    on public.body_measurements for select using (user_id = auth.uid());
create policy "Créer mesure"        on public.body_measurements for insert with check (user_id = auth.uid());
create policy "Modifier sa mesure"  on public.body_measurements for update using (user_id = auth.uid());
create policy "Supprimer sa mesure" on public.body_measurements for delete using (user_id = auth.uid());

-- ─── PERSONAL RECORDS ────────────────────────────────────────────────────────
-- Vue matérialisée légère : 1RM max par exercice par utilisateur
create table if not exists public.personal_records (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  exercise_nom text not null,
  record_type  text check (record_type in ('1rm_estimated', '1rm_actual', 'max_reps', 'max_volume')) not null,
  value        numeric not null,
  achieved_at  date not null,
  workout_id   uuid references public.workouts(id) on delete set null,
  unique (user_id, exercise_nom, record_type)
);

alter table public.personal_records enable row level security;
create policy "Voir ses PR"    on public.personal_records for select using (user_id = auth.uid());
create policy "Créer PR"       on public.personal_records for insert with check (user_id = auth.uid());
create policy "Modifier PR"    on public.personal_records for update using (user_id = auth.uid());

-- ─── USER GOALS ──────────────────────────────────────────────────────────────
create table if not exists public.user_goals (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  workouts_per_week int default 4,
  calorie_goal    int default 2000,
  protein_goal    int default 160,
  carbs_goal      int default 200,
  fat_goal        int default 70,
  updated_at      timestamptz default now()
);

alter table public.user_goals enable row level security;
create policy "Voir ses objectifs"    on public.user_goals for select using (user_id = auth.uid());
create policy "Modifier ses objectifs" on public.user_goals for update using (user_id = auth.uid());
create policy "Créer ses objectifs"   on public.user_goals for insert with check (user_id = auth.uid());

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
create index if not exists idx_workouts_user_date on public.workouts(user_id, date desc);
create index if not exists idx_logged_sets_workout on public.logged_sets(workout_id);
create index if not exists idx_logged_sets_exercise on public.logged_sets(exercise_nom, workout_id);
create index if not exists idx_entitlements_user on public.user_entitlements(user_id);
create index if not exists idx_programs_ebook on public.programs(ebook_id);
create index if not exists idx_body_measurements_user on public.body_measurements(user_id, date desc);
create index if not exists idx_pr_user_exercise on public.personal_records(user_id, exercise_nom);
