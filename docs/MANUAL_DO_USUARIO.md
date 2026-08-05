# Manual do Usuário — E-Lixo Consciente

## 1. Acesso

O endereço público planejado é `https://elixoconsciente.com.br`. O site pode ser utilizado para consultar pontos sem cadastro. Para sugerir ou acompanhar pontos, é necessário criar uma conta.

As páginas usam endereços simplificados, sem a extensão `.html`, como `/login`, `/mapa` e `/meus-pontos`.

## 2. Encontrar um ponto de coleta

1. Na página inicial, informe rua, bairro, cidade ou CEP.
2. Clique em **Buscar**.
3. No mapa, escolha a localização correta quando houver nomes semelhantes.
4. Os pontos serão exibidos por proximidade.
5. Selecione **Informações** para consultar telefone, endereço, horário e materiais aceitos.
6. Use **Como chegar** para abrir a rota.

O botão **Minha localização** solicita autorização do navegador, identifica o endereço atual e ordena os pontos do mais próximo para o mais distante. Em ambiente público, esse recurso requer HTTPS.

## 3. Criar uma conta

1. Clique em **Criar conta**.
2. Informe nome, e-mail e senha.
3. A senha deve possuir ao menos oito caracteres.
4. Ao concluir, o usuário entra no sistema e pode utilizar as funções colaborativas.

## 4. Entrar e navegar

Após o login, a página inicial continua sendo exibida. O cabeçalho mostra o atalho **Meus pontos de coleta** e o avatar. O menu do avatar contém o acesso ao perfil e a opção **Sair**.

## 5. Sugerir um ponto

1. Clique em **Sugerir novo ponto** ou **Cadastrar novo ponto**.
2. Preencha as etapas do formulário.
3. Informe nome, tipo, endereço completo, telefone e horário.
4. Selecione ao menos um material aceito.
5. Revise e envie.

O nome do ponto é salvo em letras maiúsculas. Para usuários comuns, o cadastro fica **Em análise** até a decisão do administrador. Pontos cadastrados por administradores são publicados imediatamente.

## 6. Acompanhar pontos

Em **Meus pontos de coleta**, o usuário encontra os totais enviados, em análise, aprovados e rejeitados. Cada cadastro apresenta seu status e, quando aplicável, o motivo da rejeição.

Para pedir a retirada de um ponto cadastrado pelo próprio usuário, utilize a opção de solicitar exclusão e informe o motivo. A remoção depende da análise administrativa.

## 7. Atualizar o perfil

No menu do avatar, abra **Meu perfil**. É possível atualizar nome, telefone, data de nascimento e endereço. O e-mail identifica a conta. A mesma página permite alterar a senha após confirmar a senha atual.

## 8. Recuperar a senha

Na tela de login, selecione **Esqueci minha senha**. A estrutura de token e redefinição já existe, mas o envio automático do link por e-mail ainda não está disponível na versão pública inicial. Essa integração está registrada como melhoria necessária.

## 9. Administração

Usuários com perfil administrativo visualizam **Painel administrador** no cabeçalho.

No painel, o administrador pode:

- Consultar totais de pontos e usuários.
- Pesquisar e filtrar cadastros.
- Ver todos os dados de um ponto.
- Aprovar ou rejeitar sugestões.
- Informar o motivo da rejeição.
- Analisar solicitações de exclusão.
- Cadastrar pontos publicados imediatamente.
- Pesquisar usuários cadastrados.
- Promover usuários a administradores.
- Alterar administradores para colaboradores, retirando apenas os privilégios administrativos.
- Inativar e reativar contas sem excluir o cadastro, os pontos ou o histórico.

O administrador não pode rebaixar nem inativar a própria conta, e o sistema protege o último administrador ativo. Uma conta inativada perde o acesso imediatamente, inclusive quando ainda possui uma sessão aberta.

## 10. Boas práticas

- Cadastre somente locais cuja existência possa ser confirmada.
- Informe telefone e horário atualizados.
- Selecione apenas os materiais efetivamente recebidos.
- Não inclua dados pessoais nas observações do ponto.
- Termine a sessão pelo botão **Sair** em computadores compartilhados.

## 11. Problemas comuns

| Situação | Orientação |
|---|---|
| Localização não funciona | Autorize a localização e confirme que o site usa HTTPS |
| Nenhum ponto aparece | Tente pesquisar pela cidade ou CEP e verifique a conexão |
| Ponto não está público | Consulte o status em **Meus pontos de coleta** |
| Login inválido | Confirme e-mail e senha; não compartilhe credenciais |
| Endereço semelhante em várias cidades | Escolha a cidade e o estado corretos na lista do mapa |
