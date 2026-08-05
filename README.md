# E-Lixo Consciente

Plataforma web colaborativa para localizar, cadastrar e validar pontos de coleta de resíduos eletrônicos. O projeto aproxima cidadãos de locais adequados para descarte e contribui com o ODS 12 — Consumo e Produção Responsáveis.

Projeto acadêmico desenvolvido no curso de Tecnologia em Análise e Desenvolvimento de Sistemas da UNINTER por:

- Andrey Gabriel Custódio da Silva
- Christian Netto
- Kauã Dias Martins

## Funcionalidades

- Consulta pública de pontos aprovados.
- Busca por nome, rua, bairro, cidade, estado ou CEP.
- Mapa interativo com seleção de localidades semelhantes.
- Geolocalização e ordenação dos pontos por distância.
- Informações de endereço, telefone, horário e materiais aceitos.
- Cadastro e autenticação de usuários.
- Sugestão colaborativa de novos pontos.
- Acompanhamento de pontos pendentes, aprovados e rejeitados.
- Perfil do usuário e alteração de senha.
- Solicitação de exclusão pelo autor do cadastro.
- Painel administrativo para aprovação, rejeição e manutenção.
- Cadastro administrativo com publicação imediata.

## Tecnologias

| Área | Tecnologias |
|---|---|
| Frontend | HTML5, CSS3 e JavaScript |
| Mapas | Leaflet e OpenStreetMap |
| Backend | Node.js 22 e Express 5 |
| Segurança | JWT, bcrypt, rate limiting e CORS |
| Banco | MariaDB 11 / MySQL |
| Produção | Docker Compose, Caddy e HTTPS automático |

## Documentação

- [Documentação técnica](docs/DOCUMENTACAO_TECNICA.md)
- [Manual do usuário](docs/MANUAL_DO_USUARIO.md)
- [Implantação na VPS](deploy/README.md)
- [Banco de dados](database/README.md)

## Executar localmente

Requisitos: Node.js 22 ou superior e Docker Desktop.

1. Inicie o MariaDB na raiz:

   ```bash
   docker compose --env-file .env up -d
   ```

2. Copie `backend/.env.example` para `backend/.env`. As credenciais locais ficam apenas nos arquivos `.env`, que não são enviados ao Git.

3. Instale e inicie a aplicação:

   ```bash
   cd backend
   npm ci
   npm start
   ```

4. Acesse `http://localhost:3001`.

O endpoint `http://localhost:3001/api/health` confirma o funcionamento da aplicação e do banco. O schema e o seed são executados automaticamente apenas na criação inicial do volume. Para volumes existentes, utilize as migrações de `database/migrations`.

## Verificações

Dentro de `backend`:

```bash
npm run check
npm test
npm run smoke
npm run smoke:ui
```

Na revisão de 5 de agosto de 2026, os 25 arquivos JavaScript foram validados, os 3 testes automatizados passaram e a imagem Docker de produção foi construída com sucesso.

## Administrador inicial

O seed cria somente os catálogos necessários para o sistema. Ele não cria conta administrativa nem publica credenciais padrão.

## Publicação na VPS

Crie `.env.production` a partir de `.env.production.example`, substitua todos os valores e execute:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

A composição inicia aplicação, MariaDB e Caddy em rede interna. Somente HTTP e HTTPS são publicados. Banco e certificados usam volumes persistentes. Consulte [deploy/README.md](deploy/README.md) antes da implantação ou atualização.

## Variáveis e dados sensíveis

Arquivos `.env`, dependências, logs e backups não são enviados ao Git. O segredo JWT deve possuir pelo menos 32 caracteres. Nunca publique senhas, tokens, chave SSH privada ou cópias reais do banco.

## Limitações conhecidas

- O envio real do link de recuperação de senha por e-mail ainda precisa de integração com um provedor transacional.
- A sessão utiliza `localStorage`; uma evolução recomendada é migrar para cookies `HttpOnly`, `Secure` e `SameSite` com proteção CSRF.
- A geocodificação depende de serviços externos e conexão com a internet.
- O rate limiter atual usa memória local e deve ser compartilhado caso a API seja executada em múltiplas instâncias.
