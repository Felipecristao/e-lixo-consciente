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
                <strong>${escaparHTML(ponto.tipo || "-")}</strong>
            </div>

            <div class="admin-detail-card">
                <span>Cidade</span>
                <strong>${escaparHTML(ponto.cidade || "-")}</strong>
            </div>

            <div class="admin-detail-card admin-detail-card--full">
                <span>Descricao</span>
                <p>${escaparHTML(ponto.descricao || "Nao informada.")}</p>
            </div>

            <div class="admin-detail-card admin-detail-card--full">
                <span>Observacoes</span>
                <p>${escaparHTML(ponto.observacoes || "Nenhuma.")}</p>
            </div>

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
