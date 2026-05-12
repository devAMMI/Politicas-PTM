
/*
  # Create documents storage bucket

  1. New Storage Bucket
    - `documents` — bucket público para documentos institucionales (PDFs)
      - Ruta del Código de Ética: documents/codigo-de-etica/
  2. Security
    - Lectura pública (SELECT sin restricción)
    - Solo admins autenticados pueden subir/borrar (verifica por email en admin_users)
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  52428800,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

CREATE POLICY "Authenticated admins can upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.email = auth.jwt() ->> 'email'
        AND admin_users.is_active = true
    )
  );

CREATE POLICY "Authenticated admins can delete documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.email = auth.jwt() ->> 'email'
        AND admin_users.is_active = true
    )
  );
