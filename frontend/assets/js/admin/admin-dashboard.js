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
} from "./admin-modal.js?v=20260805-1";

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
let paginaPontos = 1;
let paginaUsuarios = 1;
let resolverConfirmacaoUsuario = null;

const ITENS_POR_PAGINA = 7;

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
    configurarConfirmacaoUsuario();

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
            () => aplicarFiltros(true)
        );
    }

    if (filtroBusca) {
        filtroBusca.addEventListener(
            "input",
            () => aplicarFiltros(true)
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

function aplicarFiltros(reiniciarPagina = false) {
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

    if (reiniciarPagina) paginaPontos = 1;

    const totalPaginas = Math.max(1, Math.ceil(pontosFiltrados.length / ITENS_POR_PAGINA));
    paginaPontos = Math.min(paginaPontos, totalPaginas);
    const inicio = (paginaPontos - 1) * ITENS_POR_PAGINA;

    preencherTabela(
        pontosFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA),
        {
            onVisualizar:
                visualizarPonto,

            onAprovar:
                aprovarPonto,

            onRejeitar:
                rejeitarPonto
        }
    );

    renderizarPaginacao("paginacaoPontos", pontosFiltrados.length, paginaPontos, (pagina) => {
        paginaPontos = pagina;
        aplicarFiltros();
    });
}

function configurarGestaoUsuarios() {
    const filtro = document.getElementById("filtroUsuarios");
    const atualizar = document.getElementById("btnAtualizarUsuarios");

    filtro?.addEventListener("input", () => renderizarUsuarios(true));

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

function renderizarUsuarios(reiniciarPagina = false) {
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

    if (reiniciarPagina) paginaUsuarios = 1;

    const totalPaginas = Math.max(1, Math.ceil(usuarios.length / ITENS_POR_PAGINA));
    paginaUsuarios = Math.min(paginaUsuarios, totalPaginas);
    const inicio = (paginaUsuarios - 1) * ITENS_POR_PAGINA;
    const usuariosDaPagina = usuarios.slice(inicio, inicio + ITENS_POR_PAGINA);

    tabela.replaceChildren();

    if (!usuarios.length) {
        const linha = tabela.insertRow();
        const celula = linha.insertCell();
        celula.colSpan = 6;
        celula.className = "admin-table-empty";
        celula.textContent = "Nenhum usuário encontrado.";
        renderizarPaginacao("paginacaoUsuarios", 0, 1, () => {});
        return;
    }

    let usuarioAtual = null;

    try {
        usuarioAtual = JSON.parse(localStorage.getItem("usuario") || "null");
    } catch (erro) {
        usuarioAtual = null;
    }

    usuariosDaPagina.forEach((usuario) => {
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
        botao.className = "btn admin-user-action admin-user-action--role";
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
            ? "btn admin-user-action admin-user-action--status"
            : "btn admin-user-action admin-user-action--reactivate";
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

    renderizarPaginacao("paginacaoUsuarios", usuarios.length, paginaUsuarios, (pagina) => {
        paginaUsuarios = pagina;
        renderizarUsuarios();
    });
}

function renderizarPaginacao(id, totalItens, paginaAtual, aoMudarPagina) {
    const container = document.getElementById(id);
    if (!container) return;

    container.replaceChildren();

    if (totalItens <= ITENS_POR_PAGINA) {
        container.hidden = true;
        return;
    }

    container.hidden = false;
    const totalPaginas = Math.ceil(totalItens / ITENS_POR_PAGINA);
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA + 1;
    const fim = Math.min(paginaAtual * ITENS_POR_PAGINA, totalItens);

    const resumo = document.createElement("span");
    resumo.className = "admin-pagination__summary";
    resumo.textContent = `${inicio}–${fim} de ${totalItens}`;
    container.appendChild(resumo);

    const controles = document.createElement("div");
    controles.className = "admin-pagination__controls";

    controles.appendChild(criarBotaoPagina("‹", paginaAtual - 1, paginaAtual === 1, "Página anterior", aoMudarPagina));

    obterPaginasVisiveis(totalPaginas, paginaAtual).forEach((pagina) => {
        if (pagina === "...") {
            const intervalo = document.createElement("span");
            intervalo.className = "admin-pagination__ellipsis";
            intervalo.textContent = "…";
            controles.appendChild(intervalo);
            return;
        }

        const botao = criarBotaoPagina(String(pagina), pagina, false, `Página ${pagina}`, aoMudarPagina);
        if (pagina === paginaAtual) {
            botao.classList.add("is-active");
            botao.setAttribute("aria-current", "page");
        }
        controles.appendChild(botao);
    });

    controles.appendChild(criarBotaoPagina("›", paginaAtual + 1, paginaAtual === totalPaginas, "Próxima página", aoMudarPagina));
    container.appendChild(controles);
}

function criarBotaoPagina(texto, pagina, desabilitado, rotulo, aoMudarPagina) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "admin-pagination__button";
    botao.textContent = texto;
    botao.disabled = desabilitado;
    botao.setAttribute("aria-label", rotulo);
    botao.addEventListener("click", () => aoMudarPagina(pagina));
    return botao;
}

function obterPaginasVisiveis(totalPaginas, paginaAtual) {
    if (totalPaginas <= 7) {
        return Array.from({ length: totalPaginas }, (_, indice) => indice + 1);
    }

    const paginas = new Set([1, totalPaginas]);
    for (let pagina = paginaAtual - 1; pagina <= paginaAtual + 1; pagina += 1) {
        if (pagina > 1 && pagina < totalPaginas) paginas.add(pagina);
    }

    const ordenadas = [...paginas].sort((a, b) => a - b);
    const resultado = [];
    ordenadas.forEach((pagina, indice) => {
        if (indice && pagina - ordenadas[indice - 1] > 1) resultado.push("...");
        resultado.push(pagina);
    });
    return resultado;
}

async function confirmarAlteracaoPerfil(usuario, novoPerfil) {
    const acao = novoPerfil === "ADMIN"
        ? `tornar ${usuario.nome} administrador`
        : `tornar ${usuario.nome} colaborador`;

    const confirmado = await solicitarConfirmacaoUsuario({
        titulo: novoPerfil === "ADMIN" ? "Tornar administrador" : "Tornar colaborador",
        texto: `Deseja realmente ${acao}?`,
        textoBotao: novoPerfil === "ADMIN" ? "Confirmar administrador" : "Confirmar colaborador"
    });

    if (!confirmado) return;

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

    const confirmado = await solicitarConfirmacaoUsuario({
        titulo: ativo ? "Reativar usuário" : "Inativar usuário",
        texto: ativo
            ? `Deseja realmente ${acao}? A conta voltará a acessar a plataforma.`
            : `Deseja realmente ${acao}? A conta perderá o acesso imediatamente, mas os dados serão preservados.`,
        textoBotao: ativo ? "Confirmar reativação" : "Confirmar inativação",
        perigosa: !ativo
    });

    if (!confirmado) return;

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

function configurarConfirmacaoUsuario() {
    const modal = document.getElementById("modalConfirmacaoUsuario");
    const cancelar = document.getElementById("btnCancelarUsuario");
    const confirmar = document.getElementById("btnConfirmarUsuario");
    const fechar = document.getElementById("btnFecharUsuario");

    if (!modal || !cancelar || !confirmar || !fechar) return;

    cancelar.addEventListener("click", () => fecharConfirmacaoUsuario(false));
    fechar.addEventListener("click", () => fecharConfirmacaoUsuario(false));
    modal.querySelector("[data-fechar-usuario]")
        ?.addEventListener("click", () => fecharConfirmacaoUsuario(false));
    confirmar.addEventListener("click", () => fecharConfirmacaoUsuario(true));

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape" && modal.classList.contains("is-open")) {
            fecharConfirmacaoUsuario(false);
        }
    });
}

function solicitarConfirmacaoUsuario({ titulo, texto, textoBotao, perigosa = false }) {
    const modal = document.getElementById("modalConfirmacaoUsuario");
    const tituloModal = document.getElementById("tituloConfirmacaoUsuario");
    const textoModal = document.getElementById("textoConfirmacaoUsuario");
    const confirmar = document.getElementById("btnConfirmarUsuario");
    const icone = modal?.querySelector(".admin-confirm-modal__icon");

    if (!modal || !tituloModal || !textoModal || !confirmar || !icone) {
        return Promise.resolve(false);
    }

    tituloModal.textContent = titulo;
    textoModal.textContent = texto;
    confirmar.textContent = textoBotao;
    confirmar.className = perigosa ? "btn admin-btn-reject" : "btn btn--primary";
    icone.className = `admin-confirm-modal__icon admin-confirm-modal__icon--${perigosa ? "reject" : "approve"}`;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    window.setTimeout(() => confirmar.focus(), 80);

    return new Promise((resolve) => {
        resolverConfirmacaoUsuario = resolve;
    });
}

function fecharConfirmacaoUsuario(confirmado) {
    const modal = document.getElementById("modalConfirmacaoUsuario");
    if (!modal?.classList.contains("is-open")) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");

    if (!document.querySelector(".admin-modal.is-open")) {
        document.body.style.overflow = "";
    }

    resolverConfirmacaoUsuario?.(confirmado);
    resolverConfirmacaoUsuario = null;
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
