-- Criar bucket para arquivos de áudio
INSERT INTO storage.buckets (id, name, public) VALUES ('celebration-audio', 'celebration-audio', true);

-- Criar política para permitir upload de arquivos de áudio
CREATE POLICY "Usuários podem fazer upload de áudios de celebração" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'celebration-audio');

-- Criar política para permitir acesso público aos áudios
CREATE POLICY "Áudios de celebração são públicos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'celebration-audio');

-- Criar política para permitir atualização de arquivos
CREATE POLICY "Usuários podem atualizar áudios de celebração" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'celebration-audio');

-- Criar política para permitir deletar arquivos
CREATE POLICY "Usuários podem deletar áudios de celebração" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'celebration-audio');