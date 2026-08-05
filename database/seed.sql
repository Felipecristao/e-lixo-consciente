USE elixo;

-- Mantido para compatibilidade com instalações locais antigas.
-- Não cria usuários, senhas ou pontos de demonstração.
INSERT IGNORE INTO tipos_ponto(nome) VALUES
    ('Loja parceira'),
    ('Cooperativa'),
    ('Instituicao publica');

INSERT IGNORE INTO materiais(nome) VALUES
    ('Televisores'),
    ('Monitores'),
    ('Pilhas e baterias'),
    ('Cabos'),
    ('Celulares'),
    ('Notebooks'),
    ('Impressoras');
