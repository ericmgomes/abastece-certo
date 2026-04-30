create table if not exists profiles (
  owner_id text primary key,
  name text,
  selected_car_id text,
  filtered_car_ids text[] not null default '{}',
  theme_mode text not null default 'light',
  demo_data_loaded boolean not null default false,
  updated_at timestamp with time zone not null default now()
);

create table if not exists cars (
  id text primary key,
  owner_id text not null references profiles(owner_id) on delete cascade,
  plate text not null,
  nickname text not null,
  brand text not null default '',
  model text not null default '',
  year text not null default '',
  accepted_fuel text[] not null default '{}',
  default_fuel text not null,
  updated_at timestamp with time zone not null default now()
);

create table if not exists stations (
  id text primary key,
  owner_id text not null references profiles(owner_id) on delete cascade,
  name text not null,
  address text not null default '',
  city text,
  state text,
  latitude double precision not null,
  longitude double precision not null,
  updated_at timestamp with time zone not null default now()
);

create table if not exists fuel_logs (
  id text primary key,
  owner_id text not null references profiles(owner_id) on delete cascade,
  sequence integer,
  car_id text not null references cars(id) on delete cascade,
  station_id text not null references stations(id) on delete cascade,
  fuel text not null,
  paid numeric not null,
  liters numeric not null,
  price_per_liter numeric not null,
  created_at timestamp with time zone not null,
  latitude double precision,
  longitude double precision,
  updated_at timestamp with time zone not null default now()
);

create index if not exists cars_owner_id_idx on cars(owner_id);
create index if not exists stations_owner_id_idx on stations(owner_id);
create index if not exists fuel_logs_owner_id_created_at_idx on fuel_logs(owner_id, created_at desc);

alter table profiles enable row level security;
alter table cars enable row level security;
alter table stations enable row level security;
alter table fuel_logs enable row level security;

drop policy if exists "MVP public profiles access" on profiles;
drop policy if exists "MVP public cars access" on cars;
drop policy if exists "MVP public stations access" on stations;
drop policy if exists "MVP public fuel logs access" on fuel_logs;
drop policy if exists "Users can manage own profile" on profiles;
drop policy if exists "Users can manage own cars" on cars;
drop policy if exists "Users can manage own stations" on stations;
drop policy if exists "Users can manage own fuel logs" on fuel_logs;

create policy "Users can manage own profile"
  on profiles for all
  using (owner_id = auth.uid()::text)
  with check (owner_id = auth.uid()::text);

create policy "Users can manage own cars"
  on cars for all
  using (owner_id = auth.uid()::text)
  with check (owner_id = auth.uid()::text);

create policy "Users can manage own stations"
  on stations for all
  using (owner_id = auth.uid()::text)
  with check (owner_id = auth.uid()::text);

create policy "Users can manage own fuel logs"
  on fuel_logs for all
  using (owner_id = auth.uid()::text)
  with check (owner_id = auth.uid()::text);
