let modal;
let pontoSelecionado = null;

export function configurarModal({
    onAprovar,
    onRejeitar
}) {
    modal = document.getElementById("modalPonto");

    document
        .getElementById("btnFecharModal")
        .addEventListener("click", fecharModal);

    document
        .getElementById("btnFecharModalRodape")
        .addEventListener("click", fecharModal);

    modal
        .querySelector("[data-fechar-modal]")
        .addEventListener("click", fecharModal);

    document
        .getElementById("btnAprovarModal")
        .addEventListener("click", (evento) => {
            if (pontoSelecionado) {
                onAprovar(
                    pontoSelecionado,
                    evento.currentTarget.dataset.acao
                );
            }
        });

    document
        .getElementById("btnRejeitarModal")
        .addEventListener("click", (evento) => {
            if (pontoSelecionado) {
                onRejeitar(
                    pontoSelecionado,
                    evento.currentTarget.dataset.acao
                );
            }
        });

    document.addEventListener("keydown", (e) => {
        if (
            e.key === "Escape" &&
            modal.classList.contains("is-open")
        ) {
            fecharModal();
        }
    });
}

export function abrirModal(id) {
    pontoSelecionado = id;

    modal.classList.add("is-open");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow = "hidden";
}

export function fecharModal() {
    modal.classList.remove("is-open");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow = "";

    pontoSelecionado = null;
}

export function preencherModal(ponto) {
    const exclusaoPendente =
        ponto.exclusao_status === "PENDENTE";
    const statusClasse = exclusaoPendente
        ? "exclusao_pendente"
        : String(ponto.status || "").toLowerCase();
    const statusTexto = exclusaoPendente
        ? "EXCLUSAO_PENDENTE"
        : escaparHTML(ponto.status || "-");
    const endereco = montarEndereco(ponto);
    const materiais = Array.isArray(ponto.materiais) ? ponto.materiais : [];
    const telefone = ponto.telefone
        ? escaparHTML(ponto.telefone)
        : "Não informado";
    const telefoneLink = String(ponto.telefone || "").replace(/\D/g, "");
    const site = normalizarSite(ponto.site);

    document.getElementById("modalTitulo").textContent =
        ponto.nome || "Ponto de coleta";

    document.getElementById("modalStatus").innerHTML = `
        <span class="admin-status admin-status--${statusClasse}">
            ${statusTexto}
        </span>
    `;

    document.getElementById("modalConteudo").innerHTML = `
        <div class="admin-detail-grid">
            <div class="admin-detail-card">
                <span>Tipo</span>
                <strong>${escaparHTML(ponto.tipo || "Não informado")}</strong>
            </div>

            <div class="admin-detail-card">
                <span>Enviado por</span>
                <strong>${escaparHTML(ponto.usuario || "Não identificado")}</strong>
                <small>${escaparHTML(ponto.usuario_email || "E-mail não informado")}</small>
            </div>

            <div class="admin-detail-card admin-detail-card--full admin-detail-location">
                <div>
                    <span>Endereço completo</span>
                    <strong>${escaparHTML(endereco || "Não informado")}</strong>
                </div>
                ${criarLinkLocalizacao(ponto, endereco)}
            </div>

            <div class="admin-detail-card">
                <span>Telefone</span>
                ${telefoneLink ? `<a href="tel:${telefoneLink}">${telefone}</a>` : `<strong>${telefone}</strong>`}
            </div>

            <div class="admin-detail-card">
                <span>Horário de funcionamento</span>
                <strong>${escaparHTML(ponto.horario_funcionamento || "Não informado")}</strong>
            </div>

            <div class="admin-detail-card">
                <span>Data do cadastro</span>
                <strong>${formatarData(ponto.data_cadastro)}</strong>
            </div>

            <div class="admin-detail-card">
                <span>Site</span>
                ${site ? `<a href="${escaparHTML(site)}" target="_blank" rel="noopener noreferrer">Abrir site do ponto</a>` : "<strong>Não informado</strong>"}
            </div>

            <div class="admin-detail-card admin-detail-card--full">
                <span>Materiais aceitos</span>
                <div class="admin-materials-list">
                    ${materiais.length
                        ? materiais.map((material) => `<span class="admin-material-chip">${escaparHTML(material.nome)}</span>`).join("")
                        : "<p>Nenhum material informado.</p>"}
                </div>
            </div>

            <div class="admin-detail-card admin-detail-card--full">
                <span>Descrição</span>
                <p>${escaparHTML(ponto.descricao || "Não informada.")}</p>
            </div>

            <div class="admin-detail-card admin-detail-card--full">
                <span>Observações</span>
                <p>${escaparHTML(ponto.observacoes || "Nenhuma.")}</p>
            </div>

            ${ponto.motivo_rejeicao ? `
                <div class="admin-detail-card admin-detail-card--full admin-rejection-box">
                    <span>Motivo da rejeição</span>
                    <p>${escaparHTML(ponto.motivo_rejeicao)}</p>
                </div>
            ` : ""}

            ${
                exclusaoPendente
                    ? `
                        <div class="admin-detail-card admin-detail-card--full admin-delete-request-box">
                            <span>Solicitacao de exclusao</span>
                            <p>${escaparHTML(ponto.exclusao_motivo || "Motivo nao informado.")}</p>
                        </div>
                    `
                    : ""
            }

        </div>
    `;

    configurarBotoesAcaoModal(exclusaoPendente);
}

function montarEndereco(ponto) {
    const linhaPrincipal = [ponto.rua || ponto.endereco, ponto.numero]
        .filter(Boolean)
        .join(", ");
    const localidade = [ponto.bairro, ponto.cidade, ponto.estado]
        .filter(Boolean)
        .join(" - ");

    return [linhaPrincipal, localidade, ponto.cep]
        .filter(Boolean)
        .join(" · ");
}

function criarLinkLocalizacao(ponto, endereco) {
    const latitude = Number(ponto.latitude);
    const longitude = Number(ponto.longitude);
    const possuiCoordenadas = ponto.latitude !== null && ponto.latitude !== "" &&
        ponto.longitude !== null && ponto.longitude !== "" &&
        Number.isFinite(latitude) && Number.isFinite(longitude);
    const destino = possuiCoordenadas
        ? `${latitude},${longitude}`
        : endereco;

    if (!destino) return "";

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}`;
    return `<a class="admin-detail-map-link" href="${url}" target="_blank" rel="noopener noreferrer">Conferir no mapa</a>`;
}

function normalizarSite(valor) {
    if (!valor) return "";

    try {
        const url = new URL(/^https?:\/\//i.test(valor) ? valor : `https://${valor}`);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}

function formatarData(valor) {
    if (!valor) return "Não informada";

    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "Não informada";

    return escaparHTML(new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    }).format(data));
}

function configurarBotoesAcaoModal(exclusaoPendente) {
    const btnAprovar =
        document.getElementById("btnAprovarModal");

    const btnRejeitar =
        document.getElementById("btnRejeitarModal");

    btnAprovar.textContent =
        exclusaoPendente
            ? "Aprovar exclusao"
            : "Aprovar";

    btnRejeitar.textContent =
        exclusaoPendente
            ? "Rejeitar exclusao"
            : "Rejeitar";

    btnAprovar.dataset.acao =
        exclusaoPendente
            ? "exclusao"
            : "cadastro";

    btnRejeitar.dataset.acao =
        exclusaoPendente
            ? "exclusao"
            : "cadastro";
}

function escaparHTML(valor) {
    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
