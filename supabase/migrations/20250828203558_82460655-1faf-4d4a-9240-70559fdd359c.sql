-- Recuperar os negócios perdidos mencionados pelo usuário (sem created_by para evitar constraint)
INSERT INTO businesses (name, value, source, notes, status) VALUES
('Trentin Consultoria', 0, 'Inbound', 'Cliente adicionado pelo closer - recuperado', 'Prospecção'),
('Nós Tecnologia', 0, 'Inbound', 'Cliente adicionado pelo closer - recuperado', 'Prospecção'),
('CEI Educar', 0, 'Inbound', 'Cliente adicionado pelo closer - recuperado', 'Prospecção'),
('Grupo Downtown', 0, 'Inbound', 'Cliente adicionado pelo closer - recuperado', 'Prospecção'),
('Felicità Pizzaria', 0, 'Inbound', 'Cliente adicionado pelo closer - recuperado', 'Prospecção');