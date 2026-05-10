create table if not exists whatsapp_links (
  phone_number text primary key,
  owner_id text references profiles(owner_id) on delete cascade,
  display_name text,
  link_token text not null unique,
  token_expires_at timestamp with time zone not null,
  linked_at timestamp with time zone,
  last_message_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists whatsapp_links_owner_id_idx on whatsapp_links(owner_id);
create index if not exists whatsapp_links_link_token_idx on whatsapp_links(link_token);

alter table whatsapp_links enable row level security;

drop policy if exists "Users can read own whatsapp links" on whatsapp_links;
drop policy if exists "Admin can read whatsapp links" on whatsapp_links;

create policy "Users can read own whatsapp links"
  on whatsapp_links for select
  using (owner_id = auth.uid()::text);

create policy "Admin can read whatsapp links"
  on whatsapp_links for select
  using (auth.jwt() ->> 'email' = 'ericgomes@gmail.com');
