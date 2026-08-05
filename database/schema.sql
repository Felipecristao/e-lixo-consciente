CREATE DATABASE IF NOT EXISTS elixo;
USE elixo;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    data_nascimento DATE,
    cep VARCHAR(10),
    rua VARCHAR(120),
    numero VARCHAR(20),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado CHAR(2),
    complemento VARCHAR(120),
    perfil ENUM('ADMIN','USUARIO') DEFAULT 'USUARIO',
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tipos_ponto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS materiais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS pontos_coleta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    tipo_ponto_id INT,
    endereco VARCHAR(255),
    rua VARCHAR(120),
    numero VARCHAR(20),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado CHAR(2),
    cep VARCHAR(10),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    telefone VARCHAR(20),
    horario_funcionamento VARCHAR(150) NOT NULL,
    site VARCHAR(255),
    observacoes TEXT,
    status ENUM('PENDENTE','APROVADO','REJEITADO') DEFAULT 'PENDENTE',
    motivo_rejeicao TEXT,
    aprovado_em DATETIME,
    exclusao_status ENUM('NENHUMA','PENDENTE') DEFAULT 'NENHUMA',
    exclusao_motivo TEXT,
    exclusao_solicitada_em DATETIME,
    usuario_id INT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tipo_ponto_id) REFERENCES tipos_ponto(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS ponto_materiais (
    ponto_id INT NOT NULL,
    material_id INT NOT NULL,
    PRIMARY KEY (ponto_id, material_id),
    FOREIGN KEY (ponto_id) REFERENCES pontos_coleta(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materiais(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recuperacao_senha (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token VARCHAR(120) NOT NULL UNIQUE,
    expira_em DATETIME NOT NULL,
    usado_em DATETIME,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
