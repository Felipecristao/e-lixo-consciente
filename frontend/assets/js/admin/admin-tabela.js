import {
    escaparHTML,
    formatarData
} from "./admin-utils.js";

export function preencherTabela(
    pontos,
    {
        onVisualizar,
        onAprovar,
        onRejeitar
    }
) {
    const tbody = document.getElementById(
        "adminPontosTabela"
    );

    tbody.innerHTML = "";

    if (!Array.isArray(pontos) || pontos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="admin-table-empty"
                >
                    Nenhum ponto encontrado.
                </td>
            </tr>
        `;

        return;
    }

    pontos.forEach((ponto) => {
        const statusReal = String(
            ponto.status || "PENDENTE"
        ).toUpperCase();

        const exclusaoPendente =
            ponto.exclusao_status === "PENDENTE";

        const status =
            exclusaoPendente
                ? "EXCLUSAO_PENDENTE"
                : statusReal;

        tbody.innerHTML += `
            <tr>

                <td>
                    ${escaparHTML(
                        ponto.nome || "Não informado"
                    )}
                </td>

                <td>
                    ${escaparHTML(
                        ponto.cidade || "Não informado"
                    )}
                </td>

                <td>
                    ${escaparHTML(
                        ponto.tipo || "Não informado"
                    )}
                </td>

                <td>
                    ${escaparHTML(
                        ponto.usuario || "Não informado"
                    )}
                </td>

                <td>
                    ${formatarData(
                        ponto.data_cadastro
                    )}
                </td>

                <td>
                    <span
                        class="
                            admin-status
                            admin-status--${status.toLowerCase()}
                        "
                    >
                        ${escaparHTML(status)}
                    </span>
                </td>

                <td>
                    <div class="admin-actions">

                        <button
                            type="button"
                            class="btnVisualizar"
                            data-id="${ponto.id}"
                            title="Visualizar"
                        >
                            👁
                        </button>

                        <button
                            type="button"
                            class="btnAprovar"
                            data-id="${ponto.id}"
                            data-acao="${
                                exclusaoPendente
                                    ? "exclusao"
                                    : "cadastro"
                            }"
                            title="${
                                exclusaoPendente
                                    ? "Aprovar exclusão"
                                    : "Aprovar"
                            }"
                            ${
                                !exclusaoPendente &&
                                statusReal === "APROVADO"
                                    ? "disabled"
                                    : ""
                            }
                        >
                            ✔
                        </button>

                        <button
                            type="button"
                            class="btnRejeitar"
                            data-id="${ponto.id}"
                            data-acao="${
                                exclusaoPendente
                                    ? "exclusao"
                                    : "cadastro"
                            }"
                            title="${
                                exclusaoPendente
                                    ? "Rejeitar exclusão"
                                    : "Rejeitar"
                            }"
                            ${
                                !exclusaoPendente &&
                                statusReal === "REJEITADO"
                                    ? "disabled"
                                    : ""
                            }
                        >
                            ✖
                        </button>

                    </div>
                </td>

            </tr>
        `;
    });

    configurarEventosTabela({
        onVisualizar,
        onAprovar,
        onRejeitar
    });
}

function configurarEventosTabela({
    onVisualizar,
    onAprovar,
    onRejeitar
}) {
    const botoesVisualizar =
        document.querySelectorAll(
            ".btnVisualizar"
        );

    const botoesAprovar =
        document.querySelectorAll(
            ".btnAprovar"
        );

    const botoesRejeitar =
        document.querySelectorAll(
            ".btnRejeitar"
        );

    botoesVisualizar.forEach((botao) => {
        botao.addEventListener(
            "click",
            async () => {
                if (typeof onVisualizar !== "function") {
                    return;
                }

                await onVisualizar(
                    botao.dataset.id
                );
            }
        );
    });

    botoesAprovar.forEach((botao) => {
        botao.addEventListener(
            "click",
            async () => {
                if (
                    botao.disabled ||
                    typeof onAprovar !== "function"
                ) {
                    return;
                }

                await onAprovar(
                    botao.dataset.id,
                    botao.dataset.acao
                );
            }
        );
    });

    botoesRejeitar.forEach((botao) => {
        botao.addEventListener(
            "click",
            async () => {
                if (
                    botao.disabled ||
                    typeof onRejeitar !== "function"
                ) {
                    return;
                }

                await onRejeitar(
                    botao.dataset.id,
                    botao.dataset.acao
                );
            }
        );
    });
}
