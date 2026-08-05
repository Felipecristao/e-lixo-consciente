document.addEventListener("DOMContentLoaded", () => {
    if (redirecionarSeAutenticado()) {
        return;
    }

    const formulario =
        document.getElementById("esqueciSenhaForm");

    if (!formulario) {
        return;
    }

    formulario.addEventListener(
        "submit",
        solicitarRecuperacao
    );
});

async function solicitarRecuperacao(evento) {
    evento.preventDefault();

    const email =
        document
            .getElementById("email")
            .value
            .trim();

    const btn =
        document.getElementById(
            "btnSolicitarRecuperacao"
        );

    const linkBox =
        document.getElementById(
            "recuperacaoLinkBox"
        );

    exibirMensagem(
        "Gerando link...",
        "normal"
    );

    linkBox.hidden = true;
    linkBox.innerHTML = "";

    btn.disabled = true;
    btn.textContent = "Gerando...";

    try {
        const resposta =
            await solicitarRecuperacaoSenha(email);

        exibirMensagem(
            resposta.mensagem ||
                "Solicitação processada.",
            "sucesso"
        );

        if (resposta.link) {
            const url =
                new URL(
                    resposta.link,
                    window.location.href
                ).href;

            linkBox.hidden = false;
            linkBox.innerHTML = `
                <strong>Link de teste</strong>
                <p>Em produção, este link seria enviado por e-mail.</p>
                <a href="${url}">${url}</a>
            `;
        }
    } catch (erro) {
        exibirMensagem(
            erro.message ||
                "Erro ao gerar recuperação.",
            "erro"
        );
    } finally {
        btn.disabled = false;
        btn.textContent =
            "Gerar link de recuperacao";
    }
}

function exibirMensagem(texto, tipo) {
    const mensagem =
        document.getElementById(
            "esqueciSenhaMensagem"
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
