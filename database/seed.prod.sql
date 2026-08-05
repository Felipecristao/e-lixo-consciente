USE elixo;

-- Produção recebe apenas os catálogos necessários para o cadastro.
-- Usuários, administradores e pontos devem vir do banco restaurado ou ser criados no site.
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
