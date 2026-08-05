# Publicação na VPS

## Preparação

1. Aponte o registro DNS do domínio para o IPv4 público da VPS.
2. Instale Git e Docker com o plugin Compose.
3. Clone o repositório na VPS.
4. Copie `.env.production.example` para `.env.production` e substitua todos os valores.
5. Libere somente SSH, HTTP e HTTPS no firewall. O MariaDB não precisa de porta pública.

## Primeira inicialização

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Teste a saúde em `https://SEU_DOMINIO/api/health`. O Caddy solicita e renova o certificado HTTPS automaticamente depois que o DNS estiver correto e as portas 80 e 443 estiverem acessíveis.

Em uma instalação nova, o seed de produção cria apenas os catálogos de tipos e materiais. Ele não cria administrador padrão. Para preservar os cadastros e administradores locais, restaure o backup do banco depois da primeira inicialização. Se preferir uma base vazia, crie sua conta normalmente e promova somente esse usuário pelo banco, sem colocar senhas em comandos ou arquivos versionados.

## Atualizações futuras

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

O volume `database_data` não é recriado por esse comando, portanto as atualizações normais do código preservam os usuários e pontos cadastrados. Nunca use `docker compose down -v` em produção, pois a opção `-v` remove os volumes.

## Backup do banco

Crie backups antes de atualizar ou migrar o servidor:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec database sh -c 'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --databases elixo --single-transaction --routines --triggers' > banco_elixo.sql
```

Guarde uma cópia fora da VPS.
