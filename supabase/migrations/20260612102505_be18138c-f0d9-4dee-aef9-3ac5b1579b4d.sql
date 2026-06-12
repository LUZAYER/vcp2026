
CREATE POLICY "auth users read patient documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'patient-documents');
CREATE POLICY "auth users upload patient documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'patient-documents');
CREATE POLICY "auth users update patient documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'patient-documents');
CREATE POLICY "auth users delete patient documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'patient-documents');
