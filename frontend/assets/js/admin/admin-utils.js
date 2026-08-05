export function formatarData(data) {
    if (!data) {
        return "Não informado";
    }

    return new Date(data).toLocaleDateString("pt-BR");
}

export function formatarDataHora(data) {
    if (!data) {
        return "Não informado";
    }

    return new Date(data).toLocaleString("pt-BR");
}

export function exibirMensagem(texto, tipo) {
    const mensagem =
        document.getElementById("adminMensagem");

    if (!mensagem) {
        return;
    }

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

export function limparMensagem() {
    const mensagem =
        document.getElementById("adminMensagem");

    if (!mensagem) {
        return;
    }

    mensagem.textContent = "";
    mensagem.className = "form-message";
}

export function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}