document.addEventListener("DOMContentLoaded", () => {
    iniciarPesquisa();
});

let pontosPublicos = [];
const cacheLocalidadeCep = new Map();

async function iniciarPesquisa() {
    configurarModalContato();
    configurarPesquisa();
    configurarCidadesRapidas();
    configurarBotoesCadastro();
    configurarBotaoMapaGeral();
    configurarCarrosselPontos();

    await carregarPontosPublicos();
}

async function carregarPontosPublicos() {
    const container =
        document.getElementById("pointsContainer");

    if (!container) {
        return;
    }

    container.innerHTML = `
        <p class="body-text">
            Carregando pontos de coleta...
        </p>
    `;

    try {
        const resposta = await api("/pontos");

        pontosPublicos =
            Array.isArray(resposta)
                ? resposta
                : [];

        atualizarEstatisticasPublicas(
            pontosPublicos
        );

        renderizarPontos(
            pontosPublicos
        );
    } catch (erro) {
        console.error(
            "Erro ao carregar pontos públicos:",
            erro
        );

        pontosPublicos = [];

        atualizarEstatisticasPublicas([]);

        container.innerHTML = `
            <div class="public-points-empty">
                <strong>
                    Não foi possível carregar os pontos.
                </strong>

                <p>
                    Verifique se o servidor está funcionando
                    e atualize a página.
                </p>
            </div>
        `;
    }
}

function configurarPesquisa() {
    const campoPesquisa =
        document.getElementById("search");

    const botaoPesquisa =
        document.querySelector(
            ".search-bar__btn"
        );

    if (campoPesquisa) {
        campoPesquisa.addEventListener(
            "input",
            aplicarPesquisa
        );

        campoPesquisa.addEventListener(
            "keydown",
            (evento) => {
                if (evento.key !== "Enter") {
                    return;
                }

                evento.preventDefault();

                abrirBuscaGeografica();
            }
        );
    }

    if (botaoPesquisa) {
        botaoPesquisa.addEventListener(
            "click",
            () => {
                abrirBuscaGeografica();
            }
        );
    }
}

function configurarCidadesRapidas() {
    const campoPesquisa =
        document.getElementById("search");

    const botoes =
        document.querySelectorAll(
            ".quick-city"
        );

    botoes.forEach((botao) => {
        botao.addEventListener(
            "click",
            () => {
                if (!campoPesquisa) {
                    return;
                }

                campoPesquisa.value =
                    botao.textContent.trim();

                aplicarPesquisa();
                rolarAteResultados();
            }
        );
    });
}

function configurarBotoesCadastro() {
    const botoes =
        document.querySelectorAll(
            ".header-cta, .cta-box .btn--white, #mobile-menu .btn--primary"
        );

    botoes.forEach((botao) => {
        botao.addEventListener(
            "click",
            () => {
                const token =
                    localStorage.getItem(
                        "token"
                    );

                window.location.href =
                    token
                        ? "cadastro-ponto.html"
                        : "login.html";
            }
        );
    });
}

function configurarBotaoMapaGeral() {
    const botaoMapa =
        document.getElementById("btnVerMapaGeral");

    if (!botaoMapa) {
        return;
    }

    botaoMapa.addEventListener(
        "click",
        () => {
            localStorage.removeItem(
                "pontoMapaSelecionado"
            );

            window.location.href =
                "mapa.html";
        }
    );
}

async function aplicarPesquisa() {
    const campoPesquisa =
        document.getElementById("search");
    const valorPesquisa =
        campoPesquisa
            ? campoPesquisa.value
            : "";

    const termo =
        normalizarTexto(valorPesquisa);
    const digitosPesquisa =
        String(valorPesquisa)
            .replace(/\D/g, "");
    const pesquisaPorCep =
        Boolean(digitosPesquisa) &&
        /^[\d\s.-]+$/.test(valorPesquisa);

    if (!termo) {
        renderizarPontos(
            pontosPublicos
        );

        return;
    }

    if (
        pesquisaPorCep &&
        digitosPesquisa.length === 8
    ) {
        const pontosDoCep = pontosPublicos.filter(
            (ponto) =>
                String(ponto.cep || "")
                    .replace(/\D/g, "") ===
                digitosPesquisa
        );

        if (pontosDoCep.length) {
            renderizarPontos(pontosDoCep);
            return;
        }

        const localidade =
            await buscarLocalidadePorCep(
                digitosPesquisa
            );
        const valorAtual =
            document
                .getElementById("search")
                ?.value
                .replace(/\D/g, "");

        if (valorAtual !== digitosPesquisa) {
            return;
        }

        if (localidade?.cidade) {
            const cidade =
                normalizarTexto(localidade.cidade);
            const estado =
                normalizarTexto(localidade.estado);
            const pontosDaCidade =
                pontosPublicos.filter((ponto) =>
                    normalizarTexto(ponto.cidade) === cidade &&
                    normalizarTexto(ponto.estado) === estado
                );

            renderizarPontos(pontosDaCidade);
            return;
        }
    }

    const filtrados =
        pontosPublicos.filter(
            (ponto) => {
                const textoPesquisa = [
                    ponto.nome,
                    ponto.endereco,
                    ponto.rua,
                    ponto.numero,
                    ponto.bairro,
                    ponto.cidade,
                    ponto.estado,
                    ponto.cep
                ]
                    .filter(Boolean)
                    .join(" ");
                const textoNormalizado =
                    normalizarTexto(textoPesquisa);
                const cepNormalizado =
                    String(ponto.cep || "")
                        .replace(/\D/g, "");

                if (
                    pesquisaPorCep &&
                    cepNormalizado.includes(
                        digitosPesquisa
                    )
                ) {
                    return true;
                }

                const palavras =
                    termo.split(" ")
                        .filter(Boolean);

                return palavras.every(
                    (palavra) =>
                        textoNormalizado.includes(
                            palavra
                        )
                );
            }
        );

    renderizarPontos(filtrados);
}

async function buscarLocalidadePorCep(cep) {
    if (cacheLocalidadeCep.has(cep)) {
        return cacheLocalidadeCep.get(cep);
    }

    try {
        const resposta = await fetch(
            `https://viacep.com.br/ws/${cep}/json/`
        );

        if (!resposta.ok) {
            return null;
        }

        const endereco = await resposta.json();

        if (endereco.erro) {
            return null;
        }

        const localidade = {
            cidade: endereco.localidade || "",
            estado: endereco.uf || ""
        };

        cacheLocalidadeCep.set(cep, localidade);
        return localidade;
    } catch (erro) {
        return null;
    }
}

function abrirBuscaGeografica() {
    const valor = document
        .getElementById("search")
        ?.value
        .trim();

    if (!valor) {
        document.getElementById("search")?.focus();
        return;
    }

    localStorage.removeItem("pontoMapaSelecionado");
    window.location.href =
        `mapa.html?busca=${encodeURIComponent(valor)}`;
}

function renderizarPontos(pontos) {
    const container =
        document.getElementById(
            "pointsContainer"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!pontos.length) {
        container.innerHTML = `
            <div class="public-points-empty">
                <strong>
                    Nenhum ponto encontrado.
                </strong>

                <p>
                    Tente pesquisar por outra cidade,
                    nome do ponto ou CEP.
                </p>
            </div>
        `;

        requestAnimationFrame(
            atualizarControlesCarrossel
        );

        return;
    }

    pontos.forEach((ponto) => {
        const card =
            document.createElement(
                "article"
            );

        card.className =
            "public-point-card";

        const endereco =
            montarEndereco(ponto);

        const materiais =
            obterMateriais(ponto);

       card.innerHTML = `
    <div class="public-point-card__top">

        <div>
            <h3>
                ${escaparHTML(
                    ponto.nome ||
                    "Ponto sem nome"
                )}
            </h3>
        </div>

    </div>

    <div class="public-point-card__address">

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

            </div>

            <div class="public-point-card__materials">

                <span class="public-point-card__label">
                    Materiais aceitos
                </span>

                <div class="public-point-card__chips">
                    ${renderizarMateriais(
                        materiais
                    )}
                </div>

            </div>

            <div class="public-point-card__actions">

                <button
                    type="button"
                    class="btn btn--outline-green btnVerMapa"
                    data-id="${ponto.id}"
                >
                    Ver no mapa
                </button>

                <button
                    type="button"
                    class="btn btn--primary btnContatoPonto"
                    data-id="${ponto.id}"
                >
                    Informações
                </button>

            </div>
        `;

        container.appendChild(card);
    });

    configurarBotoesMapa();
    configurarBotoesContato();

    container.scrollLeft = 0;
    requestAnimationFrame(
        atualizarControlesCarrossel
    );
}

function configurarCarrosselPontos() {
    const container =
        document.getElementById("pointsContainer");
    const anterior =
        document.getElementById("pontosAnterior");
    const proximo =
        document.getElementById("pontosProximo");

    if (!container || !anterior || !proximo) {
        return;
    }

    anterior.addEventListener("click", () => {
        rolarCarrosselPontos(-1);
    });

    proximo.addEventListener("click", () => {
        rolarCarrosselPontos(1);
    });

    container.addEventListener(
        "scroll",
        atualizarControlesCarrossel,
        { passive: true }
    );

    window.addEventListener(
        "resize",
        atualizarControlesCarrossel
    );

    atualizarControlesCarrossel();
}

function rolarCarrosselPontos(direcao) {
    const container =
        document.getElementById("pointsContainer");
    const primeiroCard =
        container?.querySelector(".public-point-card");

    if (!container || !primeiroCard) {
        return;
    }

    const estilos = window.getComputedStyle(container);
    const espacamento =
        Number.parseFloat(estilos.columnGap || estilos.gap) || 0;

    container.scrollBy({
        left:
            direcao *
            (primeiroCard.getBoundingClientRect().width + espacamento),
        behavior: "smooth"
    });
}

function atualizarControlesCarrossel() {
    const container =
        document.getElementById("pointsContainer");
    const anterior =
        document.getElementById("pontosAnterior");
    const proximo =
        document.getElementById("pontosProximo");

    if (!container || !anterior || !proximo) {
        return;
    }

    const possuiRolagem =
        container.scrollWidth > container.clientWidth + 2;
    const chegouAoFim =
        container.scrollLeft + container.clientWidth >=
        container.scrollWidth - 2;

    anterior.hidden = !possuiRolagem;
    proximo.hidden = !possuiRolagem;
    anterior.disabled = container.scrollLeft <= 2;
    proximo.disabled = chegouAoFim;
}

function configurarBotoesMapa() {
    const botoes =
        document.querySelectorAll(
            ".btnVerMapa"
        );

    botoes.forEach((botao) => {
        botao.addEventListener(
            "click",
            () => {
                const id =
                    botao.dataset.id;

                localStorage.setItem(
                    "pontoMapaSelecionado",
                    id
                );

                window.location.href =
                    "mapa.html";
            }
        );
    });
}

function atualizarEstatisticasPublicas(
    pontos
) {
    const municipios =
        new Set(
            pontos
                .map((ponto) => {
                    const cidade =
                        String(
                            ponto.cidade || ""
                        ).trim();

                    const estado =
                        String(
                            ponto.estado || ""
                        ).trim();

                    if (!cidade) {
                        return "";
                    }

                    return `${cidade}-${estado}`;
                })
                .filter(Boolean)
        );

    atualizarTexto(
        "totalPontos",
        pontos.length
    );

    atualizarTexto(
        "totalMunicipios",
        municipios.size
    );

    atualizarTexto(
        "totalDescartes",
        "—"
    );

    atualizarTexto(
        "totalResiduos",
        "—"
    );
}

function atualizarTexto(id, valor) {
    const elemento =
        document.getElementById(id);

    if (elemento) {
        elemento.textContent = valor;
    }
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

function obterMateriais(ponto) {
    if (
        Array.isArray(
            ponto.materiais
        )
    ) {
        return ponto.materiais;
    }

    if (
        typeof ponto.materiais ===
        "string"
    ) {
        return ponto.materiais
            .split(",")
            .map((nome) => ({
                nome: nome.trim()
            }))
            .filter(
                (material) =>
                    material.nome
            );
    }

    return [];
}

function renderizarMateriais(
    materiais,
    limite = 5
) {
    if (!materiais.length) {
        return `
            <span class="public-point-card__empty-material">
                Não informado
            </span>
        `;
    }

    const materiaisExibidos =
        limite === null
            ? materiais
            : materiais.slice(0, limite);

    return materiaisExibidos
        .map((material) => {
            const nome =
                typeof material ===
                "string"
                    ? material
                    : material.nome;

            return `
                <span class="public-point-card__chip">
                    ${escaparHTML(
                        nome || "Material"
                    )}
                </span>
            `;
        })
        .join("");
}

function rolarAteResultados() {
    const container =
        document.getElementById(
            "pointsContainer"
        );

    if (!container) {
        return;
    }

    const secaoResultados =
        container.closest(".section");

    if (!secaoResultados) {
        return;
    }

    const alturaCabecalho = 95;

    const posicao =
        secaoResultados
            .getBoundingClientRect()
            .top +
        window.scrollY -
        alturaCabecalho;

    window.scrollTo({
        top: posicao,
        behavior: "smooth"
    });

}

function normalizarTexto(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function limparTelefone(valor) {
    return String(valor ?? "")
        .replace(/\D/g, "");
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function configurarBotoesContato() {
    const botoes =
        document.querySelectorAll(
            ".btnContatoPonto"
        );

    botoes.forEach((botao) => {
        botao.addEventListener(
            "click",
            () => {
                const ponto =
                    pontosPublicos.find(
                        (item) =>
                            String(item.id) ===
                            String(botao.dataset.id)
                    );

                if (ponto) {
                    abrirContatoPonto(ponto);
                }
            }
        );
    });
}

function configurarModalContato() {
    if (
        document.getElementById(
            "modalContatoPonto"
        )
    ) {
        return;
    }

    const modal =
        document.createElement("div");

    modal.id = "modalContatoPonto";
    modal.className = "contact-modal";
    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    modal.innerHTML = `
        <div
            class="contact-modal__overlay"
            data-fechar-contato
        ></div>

        <div
            class="contact-modal__content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contatoPontoTitulo"
        >
            <button
                type="button"
                class="contact-modal__close"
                data-fechar-contato
                aria-label="Fechar"
            >
                &times;
            </button>

            <span class="label">
                Informações do ponto
            </span>

            <h2 id="contatoPontoTitulo">
                Ponto de coleta
            </h2>

            <div
                id="contatoPontoConteudo"
                class="contact-modal__details"
            ></div>

            <div class="contact-modal__actions">
                <a
                    id="contatoPontoRota"
                    class="btn btn--primary contact-modal__route"
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Como chegar
                </a>

                <button
                    type="button"
                    class="btn btn--outline-green"
                    data-fechar-contato
                >
                    Fechar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal
        .querySelectorAll(
            "[data-fechar-contato]"
        )
        .forEach((elemento) => {
            elemento.addEventListener(
                "click",
                fecharContatoPonto
            );
        });

    document.addEventListener(
        "keydown",
        (evento) => {
            if (evento.key === "Escape") {
                fecharContatoPonto();
            }
        }
    );
}

function abrirContatoPonto(ponto) {
    const modal =
        document.getElementById(
            "modalContatoPonto"
        );

    const titulo =
        document.getElementById(
            "contatoPontoTitulo"
        );

    const conteudo =
        document.getElementById(
            "contatoPontoConteudo"
        );
    const linkRota =
        document.getElementById(
            "contatoPontoRota"
        );

    const endereco =
        montarEndereco(ponto);
    const telefone =
        ponto.telefone || "Não informado";
    const horarioFuncionamento =
        ponto.horario_funcionamento || "Não informado";
    const urlWhatsApp =
        criarUrlWhatsApp(ponto.telefone || "");
    const urlComoChegar =
        criarUrlComoChegarContato(ponto);
    const materiais = obterMateriais(ponto);

    if (linkRota) {
        linkRota.href = urlComoChegar;
    }

    titulo.textContent =
        ponto.nome || "Ponto de coleta";

    conteudo.innerHTML = `
        <div class="contact-modal__item contact-modal__item--phone">
            <div class="contact-modal__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.56 2.81.69A2 2 0 0 1 22 16.92z"/>
                </svg>
            </div>

            <div class="contact-modal__item-content">
                <span>Telefone</span>
                ${urlWhatsApp
                    ? `<a class="contact-modal__phone" href="${escaparHTML(urlWhatsApp)}" target="_blank" rel="noopener noreferrer" title="Conversar pelo WhatsApp" aria-label="Conversar com o ponto pelo WhatsApp">${escaparHTML(telefone)}</a>`
                    : `<strong>${escaparHTML(telefone)}</strong>`}
            </div>
        </div>

        <div class="contact-modal__item contact-modal__item--address">
            <div class="contact-modal__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                </svg>
            </div>

            <div class="contact-modal__item-content">
                <span>Endereço</span>
                <strong>${escaparHTML(endereco.principal)}</strong>
                <p>${escaparHTML(endereco.localidade)}</p>
                <p>${escaparHTML(ponto.cep || "CEP não informado")}</p>
            </div>
        </div>

        <div class="contact-modal__item contact-modal__item--schedule">
            <div class="contact-modal__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M12 7v5l3 2"/>
                </svg>
            </div>

            <div class="contact-modal__item-content">
                <span>Horário de funcionamento</span>
                <strong>${escaparHTML(horarioFuncionamento)}</strong>
            </div>
        </div>

        <div class="contact-modal__item contact-modal__item--materials">
            <div class="contact-modal__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="4" y="4" width="16" height="16" rx="3"/>
                    <path d="M9 9h6v6H9zM9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>
                </svg>
            </div>

            <div class="contact-modal__item-content">
                <span>Materiais aceitos</span>
                <div class="contact-modal__materials-list">
                    ${renderizarMateriais(materiais, null)}
                </div>
            </div>
        </div>

    `;

    modal.classList.add("is-open");
    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow = "hidden";
}

function criarUrlComoChegarContato(ponto) {
    const latitude = Number(ponto.latitude);
    const longitude = Number(ponto.longitude);

    if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude !== 0 &&
        longitude !== 0
    ) {
        return (
            "https://www.google.com/maps/dir/?api=1" +
            `&destination=${encodeURIComponent(
                `${latitude},${longitude}`
            )}`
        );
    }

    const endereco = [
        ponto.rua,
        ponto.numero,
        ponto.bairro,
        ponto.cidade,
        ponto.estado,
        ponto.cep
    ]
        .filter(Boolean)
        .join(", ");

    return (
        "https://www.google.com/maps/search/?api=1" +
        `&query=${encodeURIComponent(
            endereco || ponto.nome || ""
        )}`
    );
}

function criarUrlWhatsApp(telefone) {
    let numero = limparTelefone(telefone)
        .replace(/^0+/, "");

    if (!numero) {
        return "";
    }

    if (
        !numero.startsWith("55") ||
        numero.length < 12
    ) {
        numero = `55${numero}`;
    }

    return `https://wa.me/${numero}`;
}

function fecharContatoPonto() {
    const modal =
        document.getElementById(
            "modalContatoPonto"
        );

    if (!modal) {
        return;
    }

    modal.classList.remove("is-open");
    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow = "";
}
