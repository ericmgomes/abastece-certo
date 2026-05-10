alter table public.whatsapp_links
  add column if not exists conversation jsonb not null default '[]'::jsonb;

comment on column public.whatsapp_links.conversation is
  'Histórico curto de conversa do WhatsApp usado para contexto da IA.';

