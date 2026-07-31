-- Criar bucket público para fotos dos Laudos de Materiais de Içamento
insert into storage.buckets (id, name, public)
values ('laudos-materiais', 'laudos-materiais', true)
on conflict (id) do nothing;

-- Política: leitura pública das fotos
create policy "laudos_materiais_public_read" on storage.objects
  for select using (bucket_id = 'laudos-materiais');

-- Política: qualquer usuário (anon ou autenticado) pode enviar fotos
create policy "laudos_materiais_insert" on storage.objects
  for insert with check (bucket_id = 'laudos-materiais');

-- Política: qualquer usuário pode atualizar (usado no reenvio com x-upsert)
create policy "laudos_materiais_update" on storage.objects
  for update using (bucket_id = 'laudos-materiais') with check (bucket_id = 'laudos-materiais');
