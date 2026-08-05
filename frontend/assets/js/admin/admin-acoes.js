import {
    aprovarPonto,
    rejeitarPonto,
    aprovarExclusaoPonto,
    rejeitarExclusaoPonto
} from "./admin-api.js";

import {
    solicitarAprovacao,
    solicitarRejeicao
} from "./admin-confirmacao.js";

import {
    exibirMensagem
} from "./admin-utils.js";

export async function confirmarAprovacao(
    id,
    atualizarPainel,
    acao = "cadastro"
) {
    const confirmacao =
        await solicitarAprovacao(id, acao);

    if (
        !confirmacao ||
        !confirmacao.confirmado
    ) {
        return false;
    }

    try {
        if (acao === "exclusao") {
            await aprovarExclusaoPonto(
                confirmacao.id
            );
        } else {
            await aprovarPonto(
                confirmacao.id
            );
        }

        if (
            typeof atualizarPainel ===
            "function"
        ) {
            await atualizarPainel();
        }

        return true;
    } catch (erro) {
        exibirMensagem(
            erro.message ||
                "Erro ao aprovar o ponto.",
            "erro"
        );

        return false;
    }
}

export async function confirmarRejeicao(
    id,
    atualizarPainel,
    acao = "cadastro"
) {
    const confirmacao =
        await solicitarRejeicao(id, acao);

    if (
        !confirmacao ||
        !confirmacao.confirmado
    ) {
        return false;
    }

    try {
        if (acao === "exclusao") {
            await rejeitarExclusaoPonto(
                confirmacao.id
            );
        } else {
            await rejeitarPonto(
                confirmacao.id,
                confirmacao.motivo
            );
        }

        if (
            typeof atualizarPainel ===
            "function"
        ) {
            await atualizarPainel();
        }

        return true;
    } catch (erro) {
        exibirMensagem(
            erro.message ||
                "Erro ao rejeitar o ponto.",
            "erro"
        );

        return false;
    }
}
