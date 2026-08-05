let pontoAprovacaoId = null;
let pontoRejeicaoId = null;

let resolverAprovacao = null;
let resolverRejeicao = null;

export function configurarConfirmacoes() {
    configurarModalAprovacao();
    configurarModalRejeicao();
    configurarTeclaEscape();
}

/* Aprovação */

function configurarModalAprovacao() {
    const modal =
        document.getElementById("modalAprovacao");

    const btnFechar =
        document.getElementById(
            "btnFecharAprovacao"
        );

    const btnCancelar =
        document.getElementById(
            "btnCancelarAprovacao"
        );

    const btnConfirmar =
        document.getElementById(
            "btnConfirmarAprovacao"
        );

    if (
        !modal ||
        !btnFechar ||
        !btnCancelar ||
        !btnConfirmar
    ) {
        return;
    }

    btnFechar.addEventListener(
        "click",
        cancelarAprovacao
    );

    btnCancelar.addEventListener(
        "click",
        cancelarAprovacao
    );

    modal
        .querySelectorAll(
            "[data-fechar-aprovacao]"
        )
        .forEach((elemento) => {
            elemento.addEventListener(
                "click",
                cancelarAprovacao
            );
        });

    btnConfirmar.addEventListener(
        "click",
        confirmarAprovacaoModal
    );
}

export function solicitarAprovacao(id, acao = "cadastro") {
    const modal =
        document.getElementById(
            "modalAprovacao"
        );

    if (!modal) {
        return Promise.resolve(false);
    }

    pontoAprovacaoId = id;
    configurarAprovacaoExclusao(acao);

    limparMensagemAprovacao();

    abrirModalConfirmacao(modal);

    return new Promise((resolve) => {
        resolverAprovacao = resolve;
    });
}

function confirmarAprovacaoModal() {
    const modal =
        document.getElementById(
            "modalAprovacao"
        );

    if (!pontoAprovacaoId) {
        cancelarAprovacao();
        return;
    }

    const resultado = {
        confirmado: true,
        id: pontoAprovacaoId
    };

    fecharModalConfirmacao(modal);

    pontoAprovacaoId = null;

    if (resolverAprovacao) {
        resolverAprovacao(resultado);
        resolverAprovacao = null;
    }
}

function cancelarAprovacao() {
    const modal =
        document.getElementById(
            "modalAprovacao"
        );

    fecharModalConfirmacao(modal);

    pontoAprovacaoId = null;

    if (resolverAprovacao) {
        resolverAprovacao(false);
        resolverAprovacao = null;
    }
}

/* Rejeição */

function configurarModalRejeicao() {
    const modal =
        document.getElementById(
            "modalRejeicao"
        );

    const btnFechar =
        document.getElementById(
            "btnFecharRejeicao"
        );

    const btnCancelar =
        document.getElementById(
            "btnCancelarRejeicao"
        );

    const btnConfirmar =
        document.getElementById(
            "btnConfirmarRejeicao"
        );

    if (
        !modal ||
        !btnFechar ||
        !btnCancelar ||
        !btnConfirmar
    ) {
        return;
    }

    btnFechar.addEventListener(
        "click",
        cancelarRejeicao
    );

    btnCancelar.addEventListener(
        "click",
        cancelarRejeicao
    );

    modal
        .querySelectorAll(
            "[data-fechar-rejeicao]"
        )
        .forEach((elemento) => {
            elemento.addEventListener(
                "click",
                cancelarRejeicao
            );
        });

    btnConfirmar.addEventListener(
        "click",
        confirmarRejeicaoModal
    );
}

export function solicitarRejeicao(id, acao = "cadastro") {
    const modal =
        document.getElementById(
            "modalRejeicao"
        );

    const campoMotivo =
        document.getElementById(
            "motivoRejeicao"
        );

    if (!modal || !campoMotivo) {
        return Promise.resolve(false);
    }

    pontoRejeicaoId = id;
    modal.dataset.acao = acao;
    configurarRejeicaoExclusao(acao);

    campoMotivo.value = "";

    limparMensagemRejeicao();

    abrirModalConfirmacao(modal);

    setTimeout(() => {
        campoMotivo.focus();
    }, 100);

    return new Promise((resolve) => {
        resolverRejeicao = resolve;
    });
}

function confirmarRejeicaoModal() {
    const modal =
        document.getElementById(
            "modalRejeicao"
        );

    const campoMotivo =
        document.getElementById(
            "motivoRejeicao"
        );

    if (
        !modal ||
        !campoMotivo ||
        !pontoRejeicaoId
    ) {
        cancelarRejeicao();
        return;
    }

    const motivo =
        campoMotivo.value.trim();

    if (
        modal.dataset.acao !== "exclusao" &&
        !motivo
    ) {
        exibirMensagemRejeicao(
            "Informe o motivo da rejeição."
        );

        campoMotivo.focus();

        return;
    }

    const resultado = {
        confirmado: true,
        id: pontoRejeicaoId,
        motivo
    };

    fecharModalConfirmacao(modal);

    pontoRejeicaoId = null;
    campoMotivo.value = "";

    if (resolverRejeicao) {
        resolverRejeicao(resultado);
        resolverRejeicao = null;
    }
}

function cancelarRejeicao() {
    const modal =
        document.getElementById(
            "modalRejeicao"
        );

    const campoMotivo =
        document.getElementById(
            "motivoRejeicao"
        );

    fecharModalConfirmacao(modal);

    pontoRejeicaoId = null;

    if (campoMotivo) {
        campoMotivo.value = "";
    }

    limparMensagemRejeicao();

    if (resolverRejeicao) {
        resolverRejeicao(false);
        resolverRejeicao = null;
    }
}

/* Controle dos modais */

function abrirModalConfirmacao(modal) {
    if (!modal) {
        return;
    }

    modal.classList.add("is-open");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";
}

function fecharModalConfirmacao(modal) {
    if (!modal) {
        return;
    }

    modal.classList.remove("is-open");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    if (
        !document.querySelector(
            ".admin-modal.is-open"
        )
    ) {
        document.body.style.overflow = "";
    }
}

function configurarTeclaEscape() {
    document.addEventListener(
        "keydown",
        (evento) => {
            if (evento.key !== "Escape") {
                return;
            }

            const modalRejeicao =
                document.getElementById(
                    "modalRejeicao"
                );

            const modalAprovacao =
                document.getElementById(
                    "modalAprovacao"
                );

            if (
                modalRejeicao &&
                modalRejeicao.classList.contains(
                    "is-open"
                )
            ) {
                cancelarRejeicao();
                return;
            }

            if (
                modalAprovacao &&
                modalAprovacao.classList.contains(
                    "is-open"
                )
            ) {
                cancelarAprovacao();
            }
        }
    );
}

/* Mensagens */

function exibirMensagemRejeicao(texto) {
    const mensagem =
        document.getElementById(
            "mensagemModalRejeicao"
        );

    if (!mensagem) {
        return;
    }

    mensagem.textContent = texto;

    mensagem.className =
        "form-message form-message--error";
}

function limparMensagemRejeicao() {
    const mensagem =
        document.getElementById(
            "mensagemModalRejeicao"
        );

    if (!mensagem) {
        return;
    }

    mensagem.textContent = "";
    mensagem.className = "form-message";
}

function limparMensagemAprovacao() {
    const mensagem =
        document.getElementById(
            "mensagemModalAprovacao"
        );

    if (!mensagem) {
        return;
    }

    mensagem.textContent = "";
    mensagem.className = "form-message";
}

function configurarAprovacaoExclusao(acao) {
    const titulo =
        document.getElementById(
            "tituloModalAprovacao"
        );

    const texto =
        document.querySelector(
            "#modalAprovacao .admin-confirm-modal__header p"
        );

    const botao =
        document.getElementById(
            "btnConfirmarAprovacao"
        );

    if (!titulo || !texto || !botao) {
        return;
    }

    if (acao === "exclusao") {
        titulo.textContent =
            "Aprovar exclusão do ponto";
        texto.textContent =
            "Tem certeza de que deseja aprovar esta solicitação? O ponto será removido da plataforma.";
        botao.textContent =
            "Confirmar exclusão";
        return;
    }

    titulo.textContent =
        "Aprovar ponto de coleta";
    texto.textContent =
        "Tem certeza de que deseja aprovar este ponto? Depois da aprovação, ele poderá aparecer publicamente na plataforma.";
    botao.textContent =
        "Confirmar aprovação";
}

function configurarRejeicaoExclusao(acao) {
    const titulo =
        document.getElementById(
            "tituloModalRejeicao"
        );

    const texto =
        document.querySelector(
            "#modalRejeicao .admin-confirm-modal__header p"
        );

    const label =
        document.querySelector(
            "label[for='motivoRejeicao']"
        );

    const campo =
        document.getElementById(
            "motivoRejeicao"
        );

    const ajuda =
        document.querySelector(
            "#modalRejeicao .admin-confirm-modal__helper"
        );

    const botao =
        document.getElementById(
            "btnConfirmarRejeicao"
        );

    if (
        !titulo ||
        !texto ||
        !label ||
        !campo ||
        !ajuda ||
        !botao
    ) {
        return;
    }

    if (acao === "exclusao") {
        titulo.textContent =
            "Rejeitar exclusão do ponto";
        texto.textContent =
            "Confirme para rejeitar a solicitação de exclusão. O ponto continuará cadastrado.";
        label.textContent = "Observação";
        campo.placeholder = "Campo opcional.";
        ajuda.textContent =
            "Não é obrigatório informar motivo para manter o ponto cadastrado.";
        botao.textContent =
            "Rejeitar exclusão";
        return;
    }

    titulo.textContent =
        "Rejeitar ponto de coleta";
    texto.textContent =
        "Informe o motivo da rejeição. Essa informação será exibida para o usuário que realizou o cadastro.";
    label.textContent =
        "Motivo da rejeição *";
    campo.placeholder =
        "Ex.: O endereço informado não foi localizado.";
    ajuda.textContent =
        "Informe um motivo claro para que o usuário possa corrigir o cadastro.";
    botao.textContent =
        "Confirmar rejeição";
}
