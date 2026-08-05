import {
    carregarResumo,
    carregarPontos,
    buscarPonto,
    carregarUsuarios,
    alterarPerfilUsuario,
    alterarStatusUsuario
} from "./admin-api.js?v=20260805-1";

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
let usuariosCarregados = [];

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
    configurarGestaoUsuarios();

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

    usuariosCarregados =
        await carregarUsuarios();

    aplicarFiltros();
    renderizarUsuarios();
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

function configurarGestaoUsuarios() {
    const filtro = document.getElementById("filtroUsuarios");
    const atualizar = document.getElementById("btnAtualizarUsuarios");

    filtro?.addEventListener("input", renderizarUsuarios);

    atualizar?.addEventListener("click", async () => {
        atualizar.disabled = true;
        atualizar.textContent = "Atualizando...";

        try {
            usuariosCarregados = await carregarUsuarios();
            renderizarUsuarios();
            exibirMensagemUsuarios("Lista de usuários atualizada.", "sucesso");
        } catch (erro) {
            exibirMensagemUsuarios(erro.message, "erro");
        } finally {
            atualizar.disabled = false;
            atualizar.textContent = "Atualizar usuários";
        }
    });
}

function renderizarUsuarios() {
    const tabela = document.getElementById("adminUsuariosTabela");
    const filtro = document.getElementById("filtroUsuarios");

    if (!tabela) return;

    const busca = String(filtro?.value || "").trim().toLowerCase();
    const usuarios = usuariosCarregados.filter((usuario) =>
        [usuario.nome, usuario.email]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(busca)
    );

    tabela.replaceChildren();

    if (!usuarios.length) {
        const linha = tabela.insertRow();
        const celula = linha.insertCell();
        celula.colSpan = 6;
        celula.className = "admin-table-empty";
        celula.textContent = "Nenhum usuário encontrado.";
        return;
    }

    let usuarioAtual = null;

    try {
        usuarioAtual = JSON.parse(localStorage.getItem("usuario") || "null");
    } catch (erro) {
        usuarioAtual = null;
    }

    usuarios.forEach((usuario) => {
        const linha = tabela.insertRow();
        linha.insertCell().textContent = usuario.nome || "Não informado";
        linha.insertCell().textContent = usuario.email || "Não informado";

        const perfil = linha.insertCell();
        const selo = document.createElement("span");
        selo.className = `admin-user-role admin-user-role--${String(usuario.perfil).toLowerCase()}`;
        selo.textContent = usuario.perfil === "ADMIN" ? "Administrador" : "Colaborador";
        perfil.appendChild(selo);

        const status = linha.insertCell();
        const ativo = Number(usuario.ativo) === 1;
        const seloStatus = document.createElement("span");
        seloStatus.className = `admin-user-status admin-user-status--${ativo ? "ativo" : "inativo"}`;
        seloStatus.textContent = ativo ? "Ativo" : "Inativo";
        status.appendChild(seloStatus);

        linha.insertCell().textContent = usuario.criado_em
            ? new Date(usuario.criado_em).toLocaleDateString("pt-BR")
            : "Não informado";

        const acoes = linha.insertCell();
        acoes.className = "admin-user-actions";
        const botao = document.createElement("button");
        const administrador = usuario.perfil === "ADMIN";
        const proprioUsuario = Number(usuario.id) === Number(usuarioAtual?.id);

        botao.type = "button";
        botao.className = administrador
            ? "btn admin-user-action admin-user-action--remove"
            : "btn btn--primary admin-user-action";
        botao.textContent = administrador ? "Tornar colaborador" : "Tornar administrador";
        botao.disabled = proprioUsuario || !ativo;
        botao.title = proprioUsuario
            ? "Você não pode alterar o próprio perfil."
            : !ativo ? "Reative o usuário antes de alterar o perfil." : "";
        botao.addEventListener("click", () =>
            confirmarAlteracaoPerfil(usuario, administrador ? "USUARIO" : "ADMIN")
        );
        acoes.appendChild(botao);

        const botaoStatus = document.createElement("button");
        botaoStatus.type = "button";
        botaoStatus.className = ativo
            ? "btn admin-user-action admin-user-action--remove"
            : "btn btn--primary admin-user-action";
        botaoStatus.textContent = ativo ? "Inativar usuário" : "Reativar usuário";
        botaoStatus.disabled = proprioUsuario;
        botaoStatus.title = proprioUsuario
            ? "Você não pode inativar a própria conta."
            : "";
        botaoStatus.addEventListener("click", () =>
            confirmarAlteracaoStatus(usuario, !ativo)
        );
        acoes.appendChild(botaoStatus);
    });
}

async function confirmarAlteracaoPerfil(usuario, novoPerfil) {
    const acao = novoPerfil === "ADMIN"
        ? `tornar ${usuario.nome} administrador`
        : `tornar ${usuario.nome} colaborador`;

    if (!window.confirm(`Deseja realmente ${acao}?`)) return;

    try {
        const resposta = await alterarPerfilUsuario(usuario.id, novoPerfil);
        usuariosCarregados = await carregarUsuarios();
        await carregarResumo();
        renderizarUsuarios();
        exibirMensagemUsuarios(resposta.mensagem, "sucesso");
    } catch (erro) {
        exibirMensagemUsuarios(erro.message, "erro");
    }
}

async function confirmarAlteracaoStatus(usuario, ativo) {
    const acao = ativo
        ? `reativar o acesso de ${usuario.nome}`
        : `inativar o acesso de ${usuario.nome}`;

    if (!window.confirm(`Deseja realmente ${acao}?`)) return;

    try {
        const resposta = await alterarStatusUsuario(usuario.id, ativo);
        usuariosCarregados = await carregarUsuarios();
        await carregarResumo();
        renderizarUsuarios();
        exibirMensagemUsuarios(resposta.mensagem, "sucesso");
    } catch (erro) {
        exibirMensagemUsuarios(erro.message, "erro");
    }
}

function exibirMensagemUsuarios(texto, tipo) {
    const mensagem = document.getElementById("usuariosMensagem");
    if (!mensagem) return;

    mensagem.textContent = texto || "Não foi possível concluir a ação.";
    mensagem.className = "form-message";
    mensagem.classList.add(
        tipo === "sucesso" ? "form-message--success" : "form-message--error"
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
