document.addEventListener("DOMContentLoaded", () => {
    iniciarDashboard();
});

function iniciarDashboard() {
    if (!protegerPagina()) {
        return;
    }

    carregarUsuario();
    configurarBotoes();
    carregarMeusPontos();
}

function protegerPagina() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "login.html";
        return false;
    }

    try {
        const usuario = JSON.parse(
            localStorage.getItem("usuario") || "null"
        );

        if (usuario?.perfil === "ADMIN") {
            window.location.replace("admin-dashboard.html");
            return false;
        }
    } catch (erro) {
        localStorage.removeItem("usuario");
    }

    return true;
}

function carregarUsuario() {
    const usuarioSalvo =
        localStorage.getItem("usuario");

    if (!usuarioSalvo) {
        return;
    }

    try {
        const usuario =
            JSON.parse(usuarioSalvo);

        const nomeUsuario =
            document.getElementById(
                "nomeUsuario"
            );

        if (nomeUsuario) {
            nomeUsuario.textContent =
                usuario.nome
                    ?.trim()
                    .split(" ")[0] ||
                "Usuário";
        }
    } catch (erro) {
        console.error(
            "Erro ao carregar usuário:",
            erro
        );
    }
}

function configurarBotoes() {
    const btnSair =
        document.getElementById("btnSair");

    const btnAtualizar =
        document.getElementById(
            "btnAtualizar"
        );

    if (btnSair) {
        btnSair.addEventListener(
            "click",
            sair
        );
    }

    if (btnAtualizar) {
        btnAtualizar.addEventListener(
            "click",
            atualizarDashboard
        );
    }

    configurarModalExclusao();
}

async function atualizarDashboard() {
    const btnAtualizar =
        document.getElementById(
            "btnAtualizar"
        );

    if (btnAtualizar) {
        btnAtualizar.disabled = true;
        btnAtualizar.textContent =
            "Atualizando...";
    }

    try {
        await carregarMeusPontos();

        exibirMensagem(
            "Painel atualizado com sucesso.",
            "sucesso"
        );
    } finally {
        if (btnAtualizar) {
            btnAtualizar.disabled = false;
            btnAtualizar.textContent =
                "Atualizar";
        }
    }
}

async function carregarMeusPontos() {
    const container =
        document.getElementById(
            "meusPontosContainer"
        );

    limparMensagem();

    container.innerHTML = `
        <div class="dashboard-loading">
            Carregando seus pontos...
        </div>
    `;

    try {
        const pontos =
            await api("/pontos/meus");

        const listaPontos =
            Array.isArray(pontos)
                ? pontos
                : [];

        atualizarEstatisticas(
            listaPontos
        );

        renderizarPontos(
            listaPontos
        );
    } catch (erro) {
        zerarEstatisticas();

        container.innerHTML = `
            <div class="dashboard-empty">
                <div class="dashboard-empty__icon">
                    !
                </div>

                <h3>
                    Não foi possível carregar seus pontos
                </h3>

                <p>
                    Verifique se o servidor está funcionando
                    e tente atualizar novamente.
                </p>
            </div>
        `;

        exibirMensagem(
            erro.message ||
                "Erro ao carregar seus pontos.",
            "erro"
        );

        throw erro;
    }
}

function atualizarEstatisticas(pontos) {
    const pendentes =
        pontos.filter(
            (ponto) =>
                normalizarStatus(
                    ponto.status
                ) === "PENDENTE"
        ).length;

    const aprovados =
        pontos.filter(
            (ponto) =>
                normalizarStatus(
                    ponto.status
                ) === "APROVADO"
        ).length;

    const rejeitados =
        pontos.filter(
            (ponto) =>
                normalizarStatus(
                    ponto.status
                ) === "REJEITADO"
        ).length;

    atualizarTextoElemento(
        "totalEnviados",
        pontos.length
    );

    atualizarTextoElemento(
        "totalPendentes",
        pendentes
    );

    atualizarTextoElemento(
        "totalAprovados",
        aprovados
    );

    atualizarTextoElemento(
        "totalRejeitados",
        rejeitados
    );
}

function zerarEstatisticas() {
    atualizarTextoElemento(
        "totalEnviados",
        0
    );

    atualizarTextoElemento(
        "totalPendentes",
        0
    );

    atualizarTextoElemento(
        "totalAprovados",
        0
    );

    atualizarTextoElemento(
        "totalRejeitados",
        0
    );
}

function atualizarTextoElemento(
    id,
    valor
) {
    const elemento =
        document.getElementById(id);

    if (elemento) {
        elemento.textContent = valor;
    }
}

function renderizarPontos(pontos) {
    const container =
        document.getElementById(
            "meusPontosContainer"
        );

    container.innerHTML = "";

    if (!pontos.length) {
        container.innerHTML = `
            <div class="dashboard-empty">

                <div class="dashboard-empty__icon">
                    +
                </div>

                <h3>
                    Você ainda não sugeriu nenhum ponto
                </h3>

                <p>
                    Cadastre um local de coleta
                    para ajudar sua cidade.
                </p>

                <a
                    href="cadastro-ponto.html"
                    class="btn btn--primary"
                >
                    Sugerir primeiro ponto
                </a>

            </div>
        `;

        return;
    }

    pontos.forEach((ponto) => {
        const card =
            criarCardPonto(ponto);

        container.appendChild(card);
    });
}

function criarCardPonto(ponto) {
    const card =
        document.createElement(
            "article"
        );

    const status =
        normalizarStatus(
            ponto.status
        );

    card.className = `
        dashboard-point-card
        ${classeCardStatus(status)}
    `.trim();

    const dataCadastro =
        ponto.data_cadastro ||
        ponto.criado_em;

    const endereco =
        montarEndereco(ponto);

    const informacaoStatus =
        montarInformacaoStatus(
            ponto,
            status
        );

    card.innerHTML = `
        <div class="dashboard-point-card__top">

            <div>

                <span class="dashboard-point-card__id">
                    Ponto #${escaparHTML(
                        ponto.id
                    )}
                </span>

                <h3>
                    ${escaparHTML(
                        ponto.nome ||
                            "Ponto sem nome"
                    )}
                </h3>

                ${
                    ponto.tipo
                        ? `
                            <span class="dashboard-point-card__type">
                                ${escaparHTML(
                                    ponto.tipo
                                )}
                            </span>
                          `
                        : ""
                }

            </div>

            <span
                class="
                    dashboard-status
                    ${classeStatus(status)}
                "
            >
                ${nomeStatus(status)}
            </span>

        </div>

        <div class="dashboard-point-card__address">

            <strong>
                ${escaparHTML(
                    endereco.principal
                )}
            </strong>

            <span>
                ${escaparHTML(
                    endereco.localidade
                )}
            </span>

            <span>
                ${escaparHTML(
                    ponto.cep ||
                        "CEP não informado"
                )}
            </span>

        </div>

        <div class="dashboard-point-card__dates">

            <div>
                <span>Enviado em</span>

                <strong>
                    ${formatarDataHora(
                        dataCadastro
                    )}
                </strong>
            </div>

            ${montarDataStatus(
                ponto,
                status
            )}

        </div>

        ${informacaoStatus}

        ${montarSolicitacaoExclusao(ponto)}

        ${montarTimeline(status)}

        ${montarAcoesPonto(ponto)}

    `;

    const btnSolicitarExclusao =
        card.querySelector(
            "[data-solicitar-exclusao]"
        );

    if (btnSolicitarExclusao) {
        btnSolicitarExclusao.addEventListener(
            "click",
            () => abrirModalExclusao(ponto.id)
        );
    }

    return card;
}

function montarSolicitacaoExclusao(ponto) {
    if (ponto.exclusao_status !== "PENDENTE") {
        return "";
    }

    return `
        <div class="dashboard-delete-request">
            <strong>
                Exclusão solicitada
            </strong>

            <p>
                Sua solicitação está aguardando análise administrativa.
            </p>

            <small>
                Motivo: ${escaparHTML(
                    ponto.exclusao_motivo ||
                        "Não informado"
                )}
            </small>
        </div>
    `;
}

function montarAcoesPonto(ponto) {
    if (ponto.exclusao_status === "PENDENTE") {
        return "";
    }

    return `
        <div class="dashboard-point-card__actions">
            <button
                type="button"
                class="btn dashboard-btn-delete"
                data-solicitar-exclusao
            >
                Solicitar exclusão
            </button>
        </div>
    `;
}

function montarEndereco(ponto) {
    const ruaNumero = [
        ponto.rua,
        ponto.numero
    ]
        .filter(Boolean)
        .join(", ");

    const principal =
        ruaNumero ||
        ponto.endereco ||
        "Endereço não informado";

    const localidade = [
        ponto.bairro,
        ponto.cidade,
        ponto.estado
    ]
        .filter(Boolean)
        .join(" - ");

    return {
        principal,
        localidade:
            localidade ||
            "Localidade não informada"
    };
}

function montarInformacaoStatus(
    ponto,
    status
) {
    if (status === "APROVADO") {
        return `
            <div
                class="
                    dashboard-status-message
                    dashboard-status-message--approved
                "
            >
                <div class="dashboard-status-message__icon">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M20 6L9 17L4 12"/>
                    </svg>
                </div>

                <div>
                    <strong>
                        Cadastro aprovado
                    </strong>

                    <p>
                        O ponto foi aprovado pela administração
                        e poderá aparecer nas consultas públicas.
                    </p>
                </div>
            </div>
        `;
    }

    if (status === "REJEITADO") {
        return `
            <div
                class="
                    dashboard-status-message
                    dashboard-status-message--rejected
                "
            >
                <div class="dashboard-status-message__icon">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        aria-hidden="true"
                    >
                        <path d="M6 6L18 18"/>
                        <path d="M18 6L6 18"/>
                    </svg>
                </div>

                <div>
                    <strong>
                        Cadastro não aprovado
                    </strong>

                    <p>
                        <b>Motivo:</b>
                        ${escaparHTML(
                            ponto.motivo_rejeicao ||
                                "O administrador não informou o motivo da rejeição."
                        )}
                    </p>
                </div>
            </div>
        `;
    }

    return `
        <div
            class="
                dashboard-status-message
                dashboard-status-message--pending
            "
        >
            <div class="dashboard-status-message__icon">
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M12 7V12L15 14"/>
                </svg>
            </div>

            <div>
                <strong>
                    Cadastro em análise
                </strong>

                <p>
                    As informações estão sendo verificadas
                    por um administrador.
                </p>
            </div>
        </div>
    `;
}

function montarDataStatus(
    ponto,
    status
) {
    if (
        status === "APROVADO" &&
        ponto.aprovado_em
    ) {
        return `
            <div>
                <span>Aprovado em</span>

                <strong>
                    ${formatarDataHora(
                        ponto.aprovado_em
                    )}
                </strong>
            </div>
        `;
    }

    if (status === "REJEITADO") {
        const dataRejeicao =
            ponto.rejeitado_em ||
            ponto.atualizado_em;

        if (dataRejeicao) {
            return `
                <div>
                    <span>Analisado em</span>

                    <strong>
                        ${formatarDataHora(
                            dataRejeicao
                        )}
                    </strong>
                </div>
            `;
        }
    }

    return "";
}

function montarTimeline(status) {
    const etapaAnaliseCompleta =
        status !== "PENDENTE";

    const classeFinal =
        status === "APROVADO"
            ? "is-approved"
            : status === "REJEITADO"
            ? "is-rejected"
            : "";

    return `
        <div class="dashboard-timeline">

            <div
                class="
                    dashboard-timeline__item
                    is-complete
                "
            >
                <span></span>

                <div>
                    <strong>
                        Cadastro enviado
                    </strong>

                    <small>
                        Informações recebidas pela plataforma
                    </small>
                </div>
            </div>

            <div
                class="
                    dashboard-timeline__item
                    ${
                        etapaAnaliseCompleta
                            ? "is-complete"
                            : "is-current"
                    }
                "
            >
                <span></span>

                <div>
                    <strong>
                        Em análise
                    </strong>

                    <small>
                        Validação das informações cadastradas
                    </small>
                </div>
            </div>

            <div
                class="
                    dashboard-timeline__item
                    ${classeFinal}
                "
            >
                <span></span>

                <div>
                    <strong>
                        ${textoEtapaFinal(status)}
                    </strong>

                    <small>
                        ${textoDescricaoFinal(status)}
                    </small>
                </div>
            </div>

        </div>
    `;
}

function classeCardStatus(status) {
    const classes = {
        PENDENTE:
            "dashboard-point-card--pending",

        APROVADO:
            "dashboard-point-card--approved",

        REJEITADO:
            "dashboard-point-card--rejected"
    };

    return classes[status] || "";
}

function classeStatus(status) {
    const classes = {
        PENDENTE:
            "dashboard-status--pending",

        APROVADO:
            "dashboard-status--approved",

        REJEITADO:
            "dashboard-status--rejected"
    };

    return classes[status] || "";
}

function nomeStatus(status) {
    const nomes = {
        PENDENTE: "Em análise",
        APROVADO: "Aprovado",
        REJEITADO: "Rejeitado"
    };

    return nomes[status] || status;
}

function normalizarStatus(status) {
    return String(
        status || "PENDENTE"
    ).toUpperCase();
}

function textoEtapaFinal(status) {
    if (status === "APROVADO") {
        return "Ponto aprovado";
    }

    if (status === "REJEITADO") {
        return "Ponto rejeitado";
    }

    return "Aguardando decisão";
}

function textoDescricaoFinal(status) {
    if (status === "APROVADO") {
        return "Disponível para consulta pública";
    }

    if (status === "REJEITADO") {
        return "Consulte o motivo informado acima";
    }

    return "Você será informado após a análise";
}

function formatarDataHora(data) {
    if (!data) {
        return "Não informado";
    }

    const dataConvertida =
        new Date(data);

    if (
        Number.isNaN(
            dataConvertida.getTime()
        )
    ) {
        return "Não informado";
    }

    return dataConvertida.toLocaleString(
        "pt-BR",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    );
}

function exibirMensagem(texto, tipo) {
    const mensagem =
        document.getElementById(
            "dashboardMensagem"
        );

    if (!mensagem) {
        return;
    }

    mensagem.textContent = texto;
    mensagem.className =
        "form-message";

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

function limparMensagem() {
    const mensagem =
        document.getElementById(
            "dashboardMensagem"
        );

    if (!mensagem) {
        return;
    }

    mensagem.textContent = "";
    mensagem.className =
        "form-message";
}

function sair() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    window.location.href =
        "index.html";
}

let pontoExclusaoId = null;

function configurarModalExclusao() {
    const modal =
        document.getElementById(
            "modalSolicitarExclusao"
        );

    if (!modal) {
        return;
    }

    [
        "btnFecharSolicitarExclusao",
        "btnCancelarSolicitarExclusao"
    ].forEach((id) => {
        const botao =
            document.getElementById(id);

        if (botao) {
            botao.addEventListener(
                "click",
                fecharModalExclusao
            );
        }
    });

    modal
        .querySelectorAll(
            "[data-fechar-exclusao]"
        )
        .forEach((elemento) => {
            elemento.addEventListener(
                "click",
                fecharModalExclusao
            );
        });

    document
        .getElementById(
            "btnConfirmarSolicitarExclusao"
        )
        .addEventListener(
            "click",
            confirmarSolicitacaoExclusao
        );
}

function abrirModalExclusao(pontoId) {
    const modal =
        document.getElementById(
            "modalSolicitarExclusao"
        );

    const campoMotivo =
        document.getElementById(
            "motivoExclusao"
        );

    pontoExclusaoId = pontoId;
    campoMotivo.value = "";
    limparMensagemExclusao();

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";

    setTimeout(() => {
        campoMotivo.focus();
    }, 100);
}

function fecharModalExclusao() {
    const modal =
        document.getElementById(
            "modalSolicitarExclusao"
        );

    if (!modal) {
        return;
    }

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";

    pontoExclusaoId = null;
    limparMensagemExclusao();
}

async function confirmarSolicitacaoExclusao() {
    const campoMotivo =
        document.getElementById(
            "motivoExclusao"
        );

    const btnConfirmar =
        document.getElementById(
            "btnConfirmarSolicitarExclusao"
        );

    const motivo =
        campoMotivo.value.trim();

    if (!motivo) {
        exibirMensagemExclusao(
            "Informe o motivo da exclusão."
        );

        campoMotivo.focus();

        return;
    }

    if (!pontoExclusaoId) {
        fecharModalExclusao();
        return;
    }

    btnConfirmar.disabled = true;
    btnConfirmar.textContent = "Enviando...";

    try {
        const resposta =
            await solicitarExclusaoPonto(
                pontoExclusaoId,
                motivo
            );

        fecharModalExclusao();

        await carregarMeusPontos();

        exibirMensagem(
            resposta.mensagem ||
                "Solicitação enviada para análise.",
            "sucesso"
        );
    } catch (erro) {
        exibirMensagemExclusao(
            erro.message ||
                "Erro ao enviar a solicitação."
        );
    } finally {
        btnConfirmar.disabled = false;
        btnConfirmar.textContent =
            "Enviar solicitação";
    }
}

function exibirMensagemExclusao(texto) {
    const mensagem =
        document.getElementById(
            "mensagemSolicitarExclusao"
        );

    mensagem.textContent = texto;
    mensagem.className =
        "form-message form-message--error";
}

function limparMensagemExclusao() {
    const mensagem =
        document.getElementById(
            "mensagemSolicitarExclusao"
        );

    if (!mensagem) {
        return;
    }

    mensagem.textContent = "";
    mensagem.className = "form-message";
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
