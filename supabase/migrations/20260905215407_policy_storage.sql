CREATE POLICY "Permitir_subir_evidencias_anonimamente"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'fotos'
  AND lower(storage."extension"(name)) IN ('jpg', 'jpeg', 'png', 'webp')
  AND LOWER((storage.foldername(name))[1]) = 'evidencias'
  AND auth.role() = 'anon'
);