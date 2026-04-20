-- =========================
-- projects
-- =========================
create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  number        text,
  title         text not null,
  em            text,
  tag           text not null check (tag in ('Residencial','Interiores','Comercial','Rural')),
  year          text,
  location      text,
  summary       text,
  intro         text,
  area          text,
  status        text,
  program       text,
  materials     text[] default '{}',
  team          text,
  photographer  text,
  cover_url     text,
  cover_alt     text,
  order_index   int default 0,
  visible       boolean default true,
  seo_title     text,
  seo_description text,
  og_image_url  text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index projects_order_idx on public.projects (order_index);
create index projects_tag_idx on public.projects (tag);
create index projects_visible_idx on public.projects (visible);

-- =========================
-- project_images (galeria)
-- =========================
create table public.project_images (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.projects(id) on delete cascade not null,
  url          text not null,
  alt          text not null,
  caption      text,
  format       text check (format in ('full','half','tall','wide','portrait','landscape','square')) default 'full',
  order_index  int default 0,
  created_at   timestamptz default now()
);

create index project_images_order_idx on public.project_images (project_id, order_index);

-- =========================
-- site_settings (single row)
-- =========================
create table public.site_settings (
  id              int primary key default 1,
  site_title      text default 'lorenaalves arq',
  site_description text,
  contact_email   text default 'contato@lorenaalvesarq.com',
  contact_phone   text,
  instagram_url   text default 'https://instagram.com/lorenaalves.arq',
  pinterest_url   text,
  linkedin_url    text,
  address_street  text,
  address_city    text,
  address_region  text,
  default_og_image text,
  updated_at      timestamptz default now(),
  constraint site_settings_single_row check (id = 1)
);

insert into public.site_settings (id) values (1) on conflict do nothing;

-- =========================
-- admin_users (whitelist)
-- =========================
create table public.admin_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  role        text default 'admin' check (role in ('admin','editor')),
  created_at  timestamptz default now()
);

-- =========================
-- analytics_events
-- =========================
create table public.analytics_events (
  id           uuid primary key default gen_random_uuid(),
  event_type   text not null,
  path         text,
  referrer     text,
  user_agent   text,
  country      text,
  session_id   text,
  project_slug text,
  created_at   timestamptz default now()
);

create index analytics_events_created_idx on public.analytics_events (created_at desc);
create index analytics_events_type_idx on public.analytics_events (event_type, created_at desc);
create index analytics_events_path_idx on public.analytics_events (path, created_at desc);

-- =========================
-- updated_at trigger
-- =========================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger site_settings_set_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

-- =========================
-- is_admin helper (security definer to avoid RLS recursion)
-- =========================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

-- =========================
-- Auto-add first admin trigger
-- When a user signs up with the configured admin email, auto-add to admin_users.
-- =========================
create or replace function public.handle_admin_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email = 'contato@lorenaalvesarq.com' then
    insert into public.admin_users (user_id, email)
    values (new.id, new.email)
    on conflict (user_id) do nothing;
  end if;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_admin_signup();

-- =========================
-- RLS
-- =========================
alter table public.projects         enable row level security;
alter table public.project_images   enable row level security;
alter table public.site_settings    enable row level security;
alter table public.admin_users      enable row level security;
alter table public.analytics_events enable row level security;

-- Public read of visible projects
create policy "public read visible projects" on public.projects
  for select using (visible = true);

create policy "public read images of visible projects" on public.project_images
  for select using (
    exists (select 1 from public.projects p where p.id = project_id and p.visible = true)
  );

create policy "public read site settings" on public.site_settings
  for select using (true);

create policy "public insert analytics" on public.analytics_events
  for insert with check (true);

-- Admin: full access
create policy "admin all projects" on public.projects
  for all using (public.is_admin()) with check (public.is_admin());

create policy "admin all images" on public.project_images
  for all using (public.is_admin()) with check (public.is_admin());

create policy "admin update settings" on public.site_settings
  for update using (public.is_admin()) with check (public.is_admin());

create policy "admin read admin_users" on public.admin_users
  for select using (public.is_admin());

create policy "admin read analytics" on public.analytics_events
  for select using (public.is_admin());

-- =========================
-- Storage buckets (public read, admin write)
-- =========================
insert into storage.buckets (id, name, public) values ('project-covers', 'project-covers', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('project-gallery', 'project-gallery', true)
  on conflict (id) do nothing;

create policy "public read covers" on storage.objects
  for select using (bucket_id = 'project-covers');
create policy "admin write covers" on storage.objects
  for insert with check (bucket_id = 'project-covers' and public.is_admin());
create policy "admin update covers" on storage.objects
  for update using (bucket_id = 'project-covers' and public.is_admin());
create policy "admin delete covers" on storage.objects
  for delete using (bucket_id = 'project-covers' and public.is_admin());

create policy "public read gallery" on storage.objects
  for select using (bucket_id = 'project-gallery');
create policy "admin write gallery" on storage.objects
  for insert with check (bucket_id = 'project-gallery' and public.is_admin());
create policy "admin update gallery" on storage.objects
  for update using (bucket_id = 'project-gallery' and public.is_admin());
create policy "admin delete gallery" on storage.objects
  for delete using (bucket_id = 'project-gallery' and public.is_admin());