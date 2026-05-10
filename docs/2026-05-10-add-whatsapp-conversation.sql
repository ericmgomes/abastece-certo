alter table public.whatsapp_links
  add column if not exists conversation jsonb not null default '[]'::jsonb;

alter table public.whatsapp_links
  add column if not exists pending_fuel_log jsonb;

comment on column public.whatsapp_links.conversation is
  'Histórico curto de conversa do WhatsApp usado para contexto da IA.';

comment on column public.whatsapp_links.pending_fuel_log is
  'Rascunho de abastecimento preparado pelo WhatsApp e aguardando confirmação.';
