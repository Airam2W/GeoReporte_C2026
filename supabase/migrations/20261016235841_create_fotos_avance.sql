-- 1. Bucket público para las fotos de avances/finalización
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos_avances',
  'fotos_avances',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- 2. Lectura pública (para mostrar la foto con su URL)
create policy "Lectura publica fotos_avances"
on storage.objects for select
using (bucket_id = 'fotos_avances');

-- 3. Columna para guardar la URL de la foto en el historial
alter table historial_reporte add column if not exists foto_url text;