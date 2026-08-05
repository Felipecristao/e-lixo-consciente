import {
    carregarResumo,
    carregarPontos,
    buscarPonto
} from "./admin-api.js";

import {
    preencherTabela
} from "./admin-tabela.js";

import {
    configurarModal,
    abrirModal,
    fecharModal,
    preencherModal
} from "./admin-modal.js";

import {
    confirmarAprovacao,
    confirmarRejeicao
} from "./admin-acoes.js";

import {
    configurarConfirmacoes
} from "./admin-confirmacao.js";

import {
    escaparHTML,
    exibirMensagem
} from "./admin-utils.js";

let pontosCarregados = [];

document.addEventListener(
    "DOMContentLoaded",
    iniciarPainel
);

async function iniciarPainel() {
    if (!protegerPagina()) {
        return;
    }

    configurarBotaoSair();
    configurarBotaoAtualizar();
    configurarFiltros();

    configurarModal({
        onAprovar: aprovarPonto,
        onRejeitar: rejeitarPonto
    });

    configurarConfirmacoes();

    try {
        await atualizarPainel();
    } catch (erro) {
        exibirMensagem(
            erro.message ||
                "Erro ao carregar o painel.",
            "erro"
        );
    }
}

function protegerPagina() {
    const token =
        localStorage.getItem("token");

    let usuario = null;

    try {
        usuario = JSON.parse(
            localStorage.getItem("usuario")
        );
    } catch (erro) {
        usuario = null;
    }

    if (!token) {
        window.location.href = "login.html";
        return false;
    }

    if (
        !usuario ||
        usuario.perfil !== "ADMIN"
    ) {
        alert(
            "Acesso permitido apenas para administradores."
        );

        window.location.href =
            "dashboard.html";

        return false;
    }

    const nomeAdmin =
        document.getElementById("nomeAdmin");

    if (nomeAdmin) {
        nomeAdmin.textContent =
            usuario.nome || "Administrador";
    }

    return true;
}

function configurarBotaoSair() {
    const btnSair =
        document.getElementById("btnSair");

    if (!btnSair) {
        return;
    }

    btnSair.addEventListener(
        "click",
        () => {
            localStorage.removeItem("token");
            localStorage.removeItem("usuario");

            window.location.href =
                "login.html";
        }
    );
}

function configurarBotaoAtualizar() {
    const btnAtualizar =
        document.getElementById(
            "btnAtualizar"
        );

    if (!btnAtualizar) {
        return;
    }

    btnAtualizar.addEventListener(
        "click",
        async () => {
            btnAtualizar.disabled = true;
            btnAtualizar.textContent =
                "Atualizando...";

            try {
                await atualizarPainel();

                exibirMensagem(
                    "Painel atualizado com sucesso.",
                    "sucesso"
                );
            } catch (erro) {
                exibirMensagem(
                    erro.message ||
                        "Erro ao atualizar o painel.",
                    "erro"
                );
            } finally {
                btnAtualizar.disabled = false;
                btnAtualizar.textContent =
                    "Atualizar";
            }
        }
    );
}

function configurarFiltros() {
    const filtroStatus =
        document.getElementById(
            "filtroStatus"
        );

    const filtroBusca =
        document.getElementById(
            "filtroBusca"
        );

    if (filtroStatus) {
        filtroStatus.addEventListener(
            "change",
            aplicarFiltros
        );
    }

    if (filtroBusca) {
        filtroBusca.addEventListener(
            "input",
            aplicarFiltros
        );
    }
}

async function atualizarPainel() {
    await carregarResumo();

    pontosCarregados =
        await carregarPontos();

    aplicarFiltros();
}

function aplicarFiltros() {
    const filtroStatus =
        document.getElementById(
            "filtroStatus"
        );

    const filtroBusca =
        document.getElementById(
            "filtroBusca"
        );

    const statusSelecionado =
        filtroStatus
            ? filtroStatus.value
            : "TODOS";

    const busca =
        filtroBusca
            ? filtroBusca.value
                  .trim()
                  .toLowerCase()
            : "";

    const pontosFiltrados =
        pontosCarregados.filter(
            (ponto) => {
                const statusPonto =
                    ponto.exclusao_status ===
                    "PENDENTE"
                        ? "EXCLUSAO_PENDENTE"
                        : ponto.status;

                const correspondeStatus =
                    statusSelecionado ===
                        "TODOS" ||
                    statusPonto ===
                        statusSelecionado;

                const textoPesquisa = [
                    ponto.nome,
                    ponto.cidade,
                    ponto.tipo,
                    ponto.usuario
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                const correspondeBusca =
                    !busca ||
                    textoPesquisa.includes(
                        busca
                    );

                return (
                    correspondeStatus &&
                    correspondeBusca
                );
            }
        );

    preencherTabela(
        pontosFiltrados,
        {
            onVisualizar:
                visualizarPonto,

            onAprovar:
                aprovarPonto,

            onRejeitar:
                rejeitarPonto
        }
    );
}

async function visualizarPonto(id) {
    abrirModal(id);

    const modalTitulo =
        document.getElementById(
            "modalTitulo"
        );

    const modalStatus =
        document.getElementById(
            "modalStatus"
        );

    const modalConteudo =
        document.getElementById(
            "modalConteudo"
        );

    if (modalTitulo) {
        modalTitulo.textContent =
            "Carregando...";
    }

    if (modalStatus) {
        modalStatus.innerHTML = "";
    }

    if (modalConteudo) {
        modalConteudo.innerHTML = `
            <p>Carregando informações...</p>
        `;
    }

    try {
        const ponto =
            await buscarPonto(id);

        preencherModal(ponto);
    } catch (erro) {
        if (modalTitulo) {
            modalTitulo.textContent =
                "Erro";
        }

        if (modalConteudo) {
            modalConteudo.innerHTML = `
                <div
                    class="
                        form-message
                        form-message--error
                    "
                >
                    ${
                        escaparHTML(
                            erro.message ||
                            "Erro ao carregar o ponto."
                        )
                    }
                </div>
            `;
        }
    }
}

async function aprovarPonto(id, acao) {
    const aprovado =
        await confirmarAprovacao(
            id,
            atualizarPainel,
            acao
        );

    if (aprovado) {
        fecharModal();
    }

    return aprovado;
}

async function rejeitarPonto(id, acao) {
    const rejeitado =
        await confirmarRejeicao(
            id,
            atualizarPainel,
            acao
        );

    if (rejeitado) {
        fecharModal();
    }

    return rejeitado;
}
