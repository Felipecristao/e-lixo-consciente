import { exibirMensagem } from "./admin-utils.js";

export async function carregarResumo() {
    const resumo = await api("/admin/resumo");

    document.getElementById("totalPendentes").textContent =
        resumo.pendentes;

    document.getElementById("totalAprovados").textContent =
        resumo.aprovados;

    document.getElementById("totalRejeitados").textContent =
        resumo.rejeitados;

    document.getElementById("totalUsuarios").textContent =
        resumo.usuarios;
}

export async function carregarPontos() {
    return await api("/admin/pontos");
}

export async function carregarUsuarios() {
    return await api("/usuarios");
}

export async function alterarPerfilUsuario(id, perfil) {
    return await api(`/usuarios/${id}/perfil`, {
        method: "PATCH",
        body: JSON.stringify({ perfil })
    });
}

export async function buscarPonto(id) {
    return await api(`/admin/pontos/${id}`);
}

export async function aprovarPonto(id) {
    const resposta = await api(
        `/admin/pontos/${id}/aprovar`,
        {
            method: "PUT"
        }
    );

    exibirMensagem(
        resposta.mensagem ||
            "Ponto aprovado com sucesso.",
        "sucesso"
    );

    return resposta;
}

export async function rejeitarPonto(id, motivo) {
    const resposta = await api(
        `/admin/pontos/${id}/rejeitar`,
        {
            method: "PUT",
            body: JSON.stringify({
                motivo
            })
        }
    );

    exibirMensagem(
        resposta.mensagem ||
            "Ponto rejeitado com sucesso.",
        "sucesso"
    );

    return resposta;
}

export async function aprovarExclusaoPonto(id) {
    const resposta = await api(
        `/admin/pontos/${id}/exclusao/aprovar`,
        {
            method: "PUT"
        }
    );

    exibirMensagem(
        resposta.mensagem ||
            "Exclusão aprovada com sucesso.",
        "sucesso"
    );

    return resposta;
}

export async function rejeitarExclusaoPonto(id) {
    const resposta = await api(
        `/admin/pontos/${id}/exclusao/rejeitar`,
        {
            method: "PUT"
        }
    );

    exibirMensagem(
        resposta.mensagem ||
            "Solicitação de exclusão rejeitada.",
        "sucesso"
    );

    return resposta;
}
