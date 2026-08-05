document.addEventListener("DOMContentLoaded", () => {
    if (redirecionarSeAutenticado()) {
        return;
    }

    const formulario = document.getElementById("cadastroForm");
    const mensagem = document.getElementById("cadastroMensagem");
    const botao = document.getElementById("btnCadastrar");

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const nome = document.getElementById("nome").value.trim();
        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value;
        const confirmarSenha =
            document.getElementById("confirmarSenha").value;

        if (senha !== confirmarSenha) {
            mensagem.textContent = "As senhas não são iguais.";
            mensagem.className =
                "form-message form-message--error";
            return;
        }

        botao.disabled = true;
        botao.textContent = "Criando conta...";

        try {
            const dados = await cadastrar(nome, email, senha);

            localStorage.setItem("token", dados.token);
            localStorage.setItem(
                "usuario",
                JSON.stringify(dados.usuario)
            );

            mensagem.textContent =
                "Conta criada com sucesso.";
            mensagem.className =
                "form-message form-message--success";

            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
        } catch (erro) {
            mensagem.textContent = erro.message;
            mensagem.className =
                "form-message form-message--error";

            botao.disabled = false;
            botao.textContent = "Criar minha conta";
        }
    });
});
