document.addEventListener("DOMContentLoaded", () => {
    if (redirecionarSeAutenticado()) {
        return;
    }

    const formulario = document.getElementById("loginForm");
    const mensagem = document.getElementById("loginMensagem");

    if (!formulario) {
        return;
    }

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value;

        mensagem.textContent = "Entrando...";
        mensagem.className = "form-message";

        try {
            const dados = await login(email, senha);

            localStorage.setItem(
                "usuario",
                JSON.stringify(dados.usuario)
            );

            mensagem.textContent = "Login realizado com sucesso.";
            mensagem.className = "form-message form-message--success";

            window.location.href = "index.html";
        } catch (erro) {
            mensagem.textContent = erro.message;
            mensagem.className = "form-message form-message--error";
        }
    });
});
