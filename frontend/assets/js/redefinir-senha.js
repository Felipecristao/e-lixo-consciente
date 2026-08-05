document.addEventListener("DOMContentLoaded", () => {
    if (redirecionarSeAutenticado()) {
        return;
    }

    const parametros =
        new URLSearchParams(window.location.search);

    document.getElementById("token").value =
        parametros.get("token") || "";

    const formulario =
        document.getElementById(
            "redefinirSenhaForm"
        );

    formulario.addEventListener(
        "submit",
        salvarNovaSenha
    );
});

async function salvarNovaSenha(evento) {
    evento.preventDefault();

    const token =
        document.getElementById("token").value;

    const novaSenha =
        document.getElementById("novaSenha").value;

    const confirmarSenha =
        document
            .getElementById("confirmarSenha")
            .value;

    const btn =
        document.getElementById(
            "btnRedefinirSenha"
        );

    if (!token) {
        exibirMensagem(
            "Token de recuperação não informado.",
            "erro"
        );

        return;
    }

    if (novaSenha.length < 8) {
        exibirMensagem(
            "A senha deve ter pelo menos 8 caracteres.",
            "erro"
        );

        return;
    }

    if (novaSenha !== confirmarSenha) {
        exibirMensagem(
            "A confirmação da senha não confere.",
            "erro"
        );

        return;
    }

    btn.disabled = true;
    btn.textContent = "Salvando...";

    exibirMensagem(
        "Salvando nova senha...",
        "normal"
    );

    try {
        const resposta =
            await redefinirSenha({
                token,
                nova_senha: novaSenha,
                confirmar_senha: confirmarSenha
            });

        exibirMensagem(
            resposta.mensagem ||
                "Senha redefinida com sucesso.",
            "sucesso"
        );

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1400);
    } catch (erro) {
        exibirMensagem(
            erro.message ||
                "Erro ao redefinir senha.",
            "erro"
        );
    } finally {
        btn.disabled = false;
        btn.textContent =
            "Salvar nova senha";
    }
}

function exibirMensagem(texto, tipo) {
    const mensagem =
        document.getElementById(
            "redefinirSenhaMensagem"
        );

    mensagem.textContent = texto;
    mensagem.className = "form-message";

    if (tipo === "erro") {
        mensagem.classList.add(
            "form-message--error"
        );
    }

    if (tipo === "sucesso") {
        mensagem.classList.add(
            "form-message--success"
        );
    }
}
