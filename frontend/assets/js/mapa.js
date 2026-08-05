document.addEventListener("DOMContentLoaded", () => {
    iniciarPaginaMapa();
});

let mapa = null;
let camadaMarcadores = null;
let marcadorLocalizacaoBusca = null;
let buscaLocalizacaoController = null;

let pontosPublicos = [];
let pontosVisiveis = [];

const marcadoresPorId = new Map();

const centroInicial = {
    latitude: -25.5163,
    longitude: -54.5854,
    zoom: 7
};

async function iniciarPaginaMapa() {
    if (typeof L === "undefined") {
        exibirMensagemMapa(
            "Não foi possível carregar a biblioteca do mapa.",
            "erro"
        );

        return;
    }

    inicializarMapa();
    configurarPesquisaMapa();
    configurarBotaoLocalizacao();
    configurarInformacoesMapa();

    await carregarPontosMapa();
}

/* Inicialização do mapa */

function inicializarMapa() {
    const elementoMapa =
        document.getElementById("map");

    if (!elementoMapa) {
        return;
    }

    mapa = L.map("map", {
        zoomControl: true,
        scrollWheelZoom: true
    }).setView(
        [
            centroInicial.latitude,
            centroInicial.longitude
        ],
        centroInicial.zoom
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }
    ).addTo(mapa);

    camadaMarcadores =
        L.layerGroup().addTo(mapa);

    setTimeout(() => {
        mapa.invalidateSize();
    }, 150);
}

/* Carregamento dos pontos */

async function carregarPontosMapa() {
    const lista =
        document.getElementById(
            "mapPointsList"
        );

    if (lista) {
        lista.innerHTML = `
            <div class="map-loading">
                Carregando pontos...
            </div>
        `;
    }

    limparMensagemMapa();

    try {
        const resposta =
            await api("/pontos");

        pontosPublicos =
            Array.isArray(resposta)
                ? resposta
                : [];

        pontosPublicos =
            pontosPublicos.filter(
                (ponto) =>
                    normalizarStatus(
                        ponto.status
                    ) === "APROVADO"
            );

        await prepararCoordenadas(
            pontosPublicos
        );

        pontosVisiveis = [
            ...pontosPublicos
        ];

        renderizarMapa(
            pontosVisiveis
        );

        await aplicarBuscaInicialMapa();
        focarPontoSelecionado();
    } catch (erro) {
        console.error(
            "Erro ao carregar o mapa:",
            erro
        );

        pontosPublicos = [];
        pontosVisiveis = [];

        atualizarTotalPontos(0);

        if (lista) {
            lista.innerHTML = `
                <div class="map-empty">
                    Não foi possível carregar os pontos.
                </div>
            `;
        }

        exibirMensagemMapa(
            erro.message ||
                "Erro ao carregar os pontos de coleta.",
            "erro"
        );
    }
}

/* Coordenadas e geocodificação */

async function prepararCoordenadas(
    pontos
) {
    const pontosSemCoordenadas =
        pontos.filter(
            (ponto) =>
                !possuiCoordenadas(
                    ponto
                )
        );

    for (
        const ponto
        of pontosSemCoordenadas
    ) {
        const coordenadasSalvas =
            obterCoordenadasCache(
                ponto
            );

        if (coordenadasSalvas) {
            ponto.latitude =
                coordenadasSalvas.latitude;

            ponto.longitude =
                coordenadasSalvas.longitude;

            continue;
        }

        const endereco =
            montarEnderecoGeocodificacao(
                ponto
            );

        if (!endereco) {
            continue;
        }

        try {
            const coordenadas =
                await geocodificarEndereco(
                    endereco
                );

            if (coordenadas) {
                ponto.latitude =
                    coordenadas.latitude;

                ponto.longitude =
                    coordenadas.longitude;

                salvarCoordenadasCache(
                    ponto,
                    coordenadas
                );
            }
        } catch (erro) {
            console.warn(
                `Não foi possível localizar o ponto ${ponto.id}:`,
                erro
            );
        }

        await aguardar(1100);
    }
}

async function geocodificarEndereco(
    endereco
) {
    const url =
        "https://nominatim.openstreetmap.org/search" +
        `?format=json` +
        `&limit=1` +
        `&countrycodes=br` +
        `&q=${encodeURIComponent(endereco)}`;

    const resposta =
        await fetch(url, {
            headers: {
                "Accept":
                    "application/json",
                "Accept-Language":
                    "pt-BR"
            }
        });

    if (!resposta.ok) {
        throw new Error(
            "Falha ao localizar o endereço."
        );
    }

    const resultados =
        await resposta.json();

    if (
        !Array.isArray(resultados) ||
        resultados.length === 0
    ) {
        return null;
    }

    const latitude =
        Number(resultados[0].lat);

    const longitude =
        Number(resultados[0].lon);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {
        return null;
    }

    return {
        latitude,
        longitude
    };
}

function possuiCoordenadas(ponto) {
    const latitude =
        Number(ponto.latitude);

    const longitude =
        Number(ponto.longitude);

    return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude !== 0 &&
        longitude !== 0
    );
}

function montarEnderecoGeocodificacao(
    ponto
) {
    const partes = [
        ponto.rua ||
            ponto.endereco,
        ponto.numero,
        ponto.bairro,
        ponto.cidade,
        ponto.estado,
        ponto.cep,
        "Brasil"
    ]
        .filter(Boolean)
        .map((parte) =>
            String(parte).trim()
        );

    return partes.join(", ");
}

function obterChaveCache(ponto) {
    return `elixo_coordenadas_${ponto.id}`;
}

function obterCoordenadasCache(ponto) {
    try {
        const valor =
            localStorage.getItem(
                obterChaveCache(ponto)
            );

        if (!valor) {
            return null;
        }

        const coordenadas =
            JSON.parse(valor);

        if (
            !Number.isFinite(
                Number(
                    coordenadas.latitude
                )
            ) ||
            !Number.isFinite(
                Number(
                    coordenadas.longitude
                )
            )
        ) {
            return null;
        }

        return {
            latitude:
                Number(
                    coordenadas.latitude
                ),

            longitude:
                Number(
                    coordenadas.longitude
                )
        };
    } catch (erro) {
        return null;
    }
}

function salvarCoordenadasCache(
    ponto,
    coordenadas
) {
    try {
        localStorage.setItem(
            obterChaveCache(ponto),
            JSON.stringify(
                coordenadas
            )
        );
    } catch (erro) {
        console.warn(
            "Não foi possível salvar as coordenadas localmente."
        );
    }
}

function aguardar(milissegundos) {
    return new Promise(
        (resolve) => {
            setTimeout(
                resolve,
                milissegundos
            );
        }
    );
}

/* Renderização */

function renderizarMapa(pontos) {
    limparMarcadores();
    renderizarListaPontos(pontos);
    atualizarTotalPontos(
        pontos.length
    );

    const pontosComCoordenadas =
        pontos.filter(
            possuiCoordenadas
        );

    pontosComCoordenadas.forEach(
        (ponto) => {
            adicionarMarcador(
                ponto
            );
        }
    );

    ajustarVisualizacaoMapa(
        pontosComCoordenadas
    );

    if (
        pontos.length > 0 &&
        pontosComCoordenadas.length === 0
    ) {
        exibirMensagemMapa(
            "Os pontos foram encontrados, mas os endereços ainda não possuem coordenadas válidas.",
            "erro"
        );
    } else {
        limparMensagemMapa();
    }
}

function limparMarcadores() {
    marcadoresPorId.clear();

    if (camadaMarcadores) {
        camadaMarcadores.clearLayers();
    }
}

function adicionarMarcador(ponto) {
    const latitude =
        Number(ponto.latitude);

    const longitude =
        Number(ponto.longitude);

    const marcador =
        L.marker(
            [latitude, longitude],
            {
                icon:
                    criarIconeMarcador()
            }
        );

    marcador.bindPopup(
        criarConteudoPopup(ponto),
        {
            maxWidth: 300
        }
    );

    marcador.on(
        "click",
        () => {
            destacarItemLista(
                ponto.id
            );
        }
    );

    marcador.addTo(
        camadaMarcadores
    );

    marcadoresPorId.set(
        String(ponto.id),
        marcador
    );
}

function criarIconeMarcador() {
    return L.divIcon({
        className:
            "map-marker-wrapper",

        html: `
            <div class="map-marker">
                <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >
                    <path
                        d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"
                    />
                    <path
                        d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"
                    />
                </svg>
            </div>
        `,

        iconSize: [42, 42],
        iconAnchor: [21, 42],
        popupAnchor: [0, -42]
    });
}

function criarConteudoPopup(ponto) {
    const endereco =
        montarEnderecoExibicao(
            ponto
        );

    const urlComoChegar =
        criarUrlComoChegar(
            ponto
        );

    return `
        <div class="map-popup">

            <h3>
                ${escaparHTML(
                    ponto.nome ||
                        "Ponto de coleta"
                )}
            </h3>

            <p>
                ${escaparHTML(
                    endereco
                )}
            </p>

            <div class="map-popup__actions">

                <a
                    href="${urlComoChegar}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Como chegar
                </a>

                <button
                    type="button"
                    class="btnInformacoesMapa"
                    data-id="${ponto.id}"
                >
                    Informações
                </button>

            </div>

        </div>
    `;
}

/* Lista lateral */

function renderizarListaPontos(
    pontos
) {
    const lista =
        document.getElementById(
            "mapPointsList"
        );

    if (!lista) {
        return;
    }

    lista.innerHTML = "";

    if (!pontos.length) {
        lista.innerHTML = `
            <div class="map-empty">
                Nenhum ponto encontrado.
            </div>
        `;

        return;
    }

    pontos.forEach((ponto) => {
        const item =
            document.createElement(
                "article"
            );

        item.className =
            "map-point-item";

        item.dataset.id =
            String(ponto.id);

        const endereco =
            montarEnderecoExibicao(
                ponto
            );

        const possuiLocalizacao =
            possuiCoordenadas(
                ponto
            );

        item.innerHTML = `
            <h3>
                ${escaparHTML(
                    ponto.nome ||
                        "Ponto de coleta"
                )}
            </h3>

            <div class="map-point-item__address">

                <span>
                    ${escaparHTML(
                        endereco
                    )}
                </span>

                <span>
                    ${escaparHTML(
                        ponto.cep ||
                            "CEP não informado"
                    )}
                </span>

                ${Number.isFinite(ponto.distanciaBusca) ? `
                    <strong class="map-point-item__distance">
                        ${formatarDistanciaMapa(ponto.distanciaBusca)} do local pesquisado
                    </strong>
                ` : ""}

            </div>

            <div class="map-point-item__actions">

                <button
                    type="button"
                    class="btn btn--outline-green btnFocarPonto"
                    data-id="${ponto.id}"
                    ${
                        possuiLocalizacao
                            ? ""
                            : "disabled"
                    }
                >
                    ${
                        possuiLocalizacao
                            ? "Ver no mapa"
                            : "Sem localização"
                    }
                </button>

                <a
                    href="${criarUrlComoChegar(
                        ponto
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn--primary"
                >
                    Como chegar
                </a>

            </div>
        `;

        item.addEventListener(
            "click",
            (evento) => {
                if (
                    evento.target.closest(
                        "a, button"
                    )
                ) {
                    return;
                }

                focarPontoNoMapa(
                    ponto.id
                );
            }
        );

        lista.appendChild(item);
    });

    configurarBotoesFocarPonto();
}

function configurarBotoesFocarPonto() {
    const botoes =
        document.querySelectorAll(
            ".btnFocarPonto"
        );

    botoes.forEach((botao) => {
        botao.addEventListener(
            "click",
            () => {
                if (botao.disabled) {
                    return;
                }

                focarPontoNoMapa(
                    botao.dataset.id
                );
            }
        );
    });
}

function focarPontoNoMapa(id) {
    const marcador =
        marcadoresPorId.get(
            String(id)
        );

    if (!marcador || !mapa) {
        exibirMensagemMapa(
            "Este ponto ainda não possui uma localização válida no mapa.",
            "erro"
        );

        return;
    }

    const coordenadas =
        marcador.getLatLng();

    mapa.flyTo(
        coordenadas,
        17,
        {
            duration: 0.8
        }
    );

    setTimeout(() => {
        marcador.openPopup();
    }, 850);

    destacarItemLista(id);

    localStorage.setItem(
        "pontoMapaSelecionado",
        String(id)
    );
}

function destacarItemLista(id) {
    const itens =
        document.querySelectorAll(
            ".map-point-item"
        );

    itens.forEach((item) => {
        item.classList.toggle(
            "is-active",
            item.dataset.id ===
                String(id)
        );
    });

    const itemSelecionado =
        document.querySelector(
            `.map-point-item[data-id="${CSS.escape(
                String(id)
            )}"]`
        );

    if (itemSelecionado) {
        itemSelecionado.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }
}

/* Foco automático vindo da home */

function focarPontoSelecionado() {
    const idSelecionado =
        localStorage.getItem(
            "pontoMapaSelecionado"
        );

    if (!idSelecionado) {
        return;
    }

    const marcador =
        marcadoresPorId.get(
            String(idSelecionado)
        );

    if (!marcador) {
        return;
    }

    setTimeout(() => {
        focarPontoNoMapa(
            idSelecionado
        );
    }, 500);
}

/* Pesquisa */

function configurarPesquisaMapa() {
    const campoPesquisa =
        document.getElementById(
            "mapSearch"
        );

    if (!campoPesquisa) {
        return;
    }

    campoPesquisa.addEventListener(
        "input",
        () => {
            ocultarResultadosLocalizacao();
            aplicarPesquisaMapa(
                campoPesquisa.value
            );
        }
    );

    campoPesquisa.addEventListener("keydown", (evento) => {
        if (evento.key !== "Enter") return;
        evento.preventDefault();
        pesquisarLocalizacaoMapa(campoPesquisa.value);
    });

    document
        .getElementById("btnBuscarEndereco")
        ?.addEventListener("click", () => {
            pesquisarLocalizacaoMapa(campoPesquisa.value);
        });
}

function aplicarPesquisaMapa(
    valor
) {
    const termo =
        normalizarTexto(valor);

    if (!termo) {
        limparDistanciasBusca();
        pontosVisiveis = [
            ...pontosPublicos
        ];

        renderizarMapa(
            pontosVisiveis
        );

        return;
    }

    const pontosFiltrados =
        pontosPublicos.filter(
            (ponto) => {
                const texto = [
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

                return normalizarTexto(
                    texto
                ).includes(termo);
            }
        );

    pontosVisiveis = pontosFiltrados.length
        ? pontosFiltrados
        : [...pontosPublicos];

    limparDistanciasBusca();

    renderizarMapa(
        pontosVisiveis
    );
}

async function aplicarBuscaInicialMapa() {
    const busca = new URLSearchParams(
        window.location.search
    ).get("busca");

    if (!busca) return;

    const campo = document.getElementById("mapSearch");
    if (campo) campo.value = busca;
    await pesquisarLocalizacaoMapa(busca);
}

async function pesquisarLocalizacaoMapa(valor) {
    const consulta = String(valor || "").trim();
    const painel = document.getElementById("mapLocationResults");
    const botao = document.getElementById("btnBuscarEndereco");

    if (consulta.length < 3) {
        exibirMensagemMapa("Digite pelo menos 3 caracteres para buscar um endereço.", "erro");
        return;
    }

    buscaLocalizacaoController?.abort();
    buscaLocalizacaoController = new AbortController();
    if (botao) {
        botao.disabled = true;
        botao.textContent = "Buscando...";
    }
    limparMensagemMapa();

    try {
        const url =
            "https://nominatim.openstreetmap.org/search" +
            `?format=jsonv2&addressdetails=1&limit=10&countrycodes=br&layer=address` +
            `&accept-language=pt-BR&q=${encodeURIComponent(consulta)}`;
        const resposta = await fetch(url, {
            signal: buscaLocalizacaoController.signal,
            headers: { "Accept": "application/json" }
        });

        if (!resposta.ok) throw new Error("Não foi possível consultar o endereço.");

        const dados = await resposta.json();
        const resultadosNominatim =
            normalizarResultadosLocalizacao(dados, consulta);
        const resultadosCep =
            await buscarLogradourosPorCep(consulta);
        const resultados = combinarResultadosLocalizacao(
            resultadosNominatim,
            resultadosCep
        );

        if (!resultados.length) {
            ocultarResultadosLocalizacao();
            exibirMensagemMapa("Nenhuma rua, bairro, cidade ou CEP foi encontrado.", "erro");
            return;
        }

        painel.hidden = false;
        painel.innerHTML = `
            <div class="map-location-results__header">
                <div><strong>Selecione a localização correta</strong><span>Encontramos ${resultados.length} ${resultados.length === 1 ? "opção" : "opções"} nas cidades atendidas.</span></div>
                <button type="button" aria-label="Fechar resultados" class="map-location-results__close">&times;</button>
            </div>
            <div class="map-location-results__list"></div>
        `;
        const lista = painel.querySelector(".map-location-results__list");
        resultados.forEach((resultado) => {
            const opcao = document.createElement("button");
            opcao.type = "button";
            opcao.className = "map-location-option";
            opcao.innerHTML = `<strong>${escaparHTML(resultado.titulo)}</strong><span>${escaparHTML(resultado.detalhes)}</span>`;
            opcao.addEventListener("click", () => selecionarLocalizacaoMapa(resultado));
            lista.appendChild(opcao);
        });
        painel.querySelector(".map-location-results__close")
            ?.addEventListener("click", ocultarResultadosLocalizacao);
    } catch (erro) {
        if (erro.name !== "AbortError") {
            exibirMensagemMapa(erro.message || "Erro ao pesquisar o endereço.", "erro");
        }
    } finally {
        if (botao) {
            botao.disabled = false;
            botao.textContent = "Buscar endereço";
        }
    }
}

async function buscarLogradourosPorCep(consulta) {
    const cidades = new Map([
        ["PR|Pato Branco", { estado: "PR", cidade: "Pato Branco" }],
        ["SP|Itapetininga", { estado: "SP", cidade: "Itapetininga" }],
        ["PI|Teresina", { estado: "PI", cidade: "Teresina" }]
    ]);

    pontosPublicos.forEach((ponto) => {
        const estado = String(ponto.estado || "").trim().toUpperCase();
        const cidade = String(ponto.cidade || "").trim();
        if (estado.length === 2 && cidade) {
            cidades.set(`${estado}|${cidade}`, { estado, cidade });
        }
    });

    const consultas = [...cidades.values()].slice(0, 15).map(async ({ estado, cidade }) => {
        try {
            const url = `https://viacep.com.br/ws/${encodeURIComponent(estado)}/${encodeURIComponent(cidade)}/${encodeURIComponent(consulta)}/json/`;
            const resposta = await fetch(url);
            if (!resposta.ok) return [];
            const dados = await resposta.json();
            return Array.isArray(dados) ? dados : [];
        } catch (erro) {
            return [];
        }
    });

    const enderecos = (await Promise.all(consultas))
        .flat()
        .filter((item) => item.cep && item.logradouro);

    const coordenados = await Promise.all(
        enderecos.map(async (endereco) => {
            try {
                const cep = String(endereco.cep).replace(/\D/g, "");
                const resposta = await fetch(`https://cep.awesomeapi.com.br/json/${cep}`);
                if (!resposta.ok) return null;
                const dados = await resposta.json();
                const latitude = Number(dados.lat);
                const longitude = Number(dados.lng);
                if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

                return {
                    titulo: endereco.logradouro,
                    detalhes: [endereco.bairro, endereco.localidade, endereco.uf, endereco.cep]
                        .filter(Boolean)
                        .join(" - "),
                    cidade: endereco.localidade,
                    estado: endereco.uf,
                    latitude,
                    longitude
                };
            } catch (erro) {
                return null;
            }
        })
    );

    return coordenados.filter(Boolean);
}

function combinarResultadosLocalizacao(...grupos) {
    const chaves = new Set();
    return grupos.flat().filter((item) => {
        const chave = normalizarTermosEndereco(
            `${item.titulo}|${item.cidade}|${item.estado}`
        ).join("|");
        if (chaves.has(chave)) return false;
        chaves.add(chave);
        return true;
    }).slice(0, 12);
}

function normalizarResultadosLocalizacao(dados, consulta) {
    if (!Array.isArray(dados)) return [];
    const chaves = new Set();
    const termosConsulta = normalizarTermosEndereco(consulta);

    return dados.map((item) => {
        const endereco = item.address || {};
        const cidade = endereco.city || endereco.town || endereco.municipality || endereco.village || "Cidade não informada";
        const bairro = endereco.suburb || endereco.neighbourhood || endereco.city_district || "";
        const estado = String(endereco["ISO3166-2-lvl4"] || endereco.state || "").replace(/^BR-/, "");
        const titulo = endereco.road || endereco.pedestrian || endereco.suburb || endereco.city || item.name || "Localização";
        const detalhes = [bairro, cidade, estado, endereco.postcode].filter(Boolean).join(" - ");
        return {
            titulo,
            detalhes,
            cidade,
            estado,
            via: endereco.road || endereco.pedestrian || "",
            latitude: Number(item.lat),
            longitude: Number(item.lon)
        };
    }).filter((item) => {
        if (!Number.isFinite(item.latitude) || !Number.isFinite(item.longitude)) return false;
        if (item.via && termosConsulta.length > 1) {
            const termosVia = normalizarTermosEndereco(item.via);
            if (!termosConsulta.every((termo) => termosVia.includes(termo))) return false;
        }
        const chave = normalizarTexto(`${item.titulo}|${item.detalhes}`);
        if (chaves.has(chave)) return false;
        chaves.add(chave);
        return true;
    });
}

function normalizarTermosEndereco(valor) {
    const palavrasIgnoradas = new Set([
        "rua", "avenida", "av", "estrada", "rodovia",
        "travessa", "de", "da", "do", "das", "dos"
    ]);

    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .split(/\s+/)
        .filter((termo) => termo && !palavrasIgnoradas.has(termo));
}

function selecionarLocalizacaoMapa(localizacao, zoom = 14, centralizarPagina = false) {
    ocultarResultadosLocalizacao();

    pontosPublicos.forEach((ponto) => {
        ponto.distanciaBusca = possuiCoordenadas(ponto)
            ? calcularDistanciaKm(localizacao.latitude, localizacao.longitude, Number(ponto.latitude), Number(ponto.longitude))
            : null;
    });

    pontosVisiveis = [...pontosPublicos].sort((a, b) =>
        (a.distanciaBusca ?? Number.POSITIVE_INFINITY) -
        (b.distanciaBusca ?? Number.POSITIVE_INFINITY)
    );
    renderizarMapa(pontosVisiveis);

    if (marcadorLocalizacaoBusca) mapa.removeLayer(marcadorLocalizacaoBusca);
    marcadorLocalizacaoBusca = L.marker(
        [localizacao.latitude, localizacao.longitude],
        { icon: criarIconeLocalizacao() }
    ).addTo(mapa).bindPopup(`<strong>Local pesquisado</strong><br>${escaparHTML(localizacao.titulo)}<br>${escaparHTML(localizacao.detalhes)}`);

    mapa.setView(
        [localizacao.latitude, localizacao.longitude],
        zoom,
        { animate: false }
    );
    marcadorLocalizacaoBusca.openPopup();
    exibirMensagemMapa(`Pontos ordenados pela distância de ${localizacao.titulo}, ${localizacao.cidade}.`, "sucesso");

    if (centralizarPagina) {
        const elementoMapa = document.getElementById("map");

        elementoMapa?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        window.setTimeout(() => mapa.invalidateSize({ pan: false }), 350);
    }
}

function criarIconeLocalizacao() {
    return L.divIcon({
        className: "map-user-location-wrapper",
        html: '<span class="map-user-location" aria-hidden="true"></span>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -14]
    });
}

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
    const rad = (graus) => graus * Math.PI / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatarDistanciaMapa(distancia) {
    if (distancia < 1) return `${Math.round(distancia * 1000)} m`;
    return `${distancia.toFixed(distancia < 10 ? 1 : 0).replace(".", ",")} km`;
}

function limparDistanciasBusca() {
    pontosPublicos.forEach((ponto) => delete ponto.distanciaBusca);
}

function ocultarResultadosLocalizacao() {
    const painel = document.getElementById("mapLocationResults");
    if (!painel) return;
    painel.hidden = true;
    painel.innerHTML = "";
}

/* Minha localização */

function configurarBotaoLocalizacao() {
    const botao =
        document.getElementById(
            "btnMinhaLocalizacao"
        );

    if (!botao) {
        return;
    }

    botao.addEventListener(
        "click",
        () => {
            localizarUsuario(botao);
        }
    );
}

function localizarUsuario(botao) {
    if (!navigator.geolocation) {
        exibirMensagemMapa(
            "Seu navegador não oferece suporte à localização.",
            "erro"
        );

        return;
    }

    const textoOriginal =
        botao.textContent;

    botao.disabled = true;
    botao.textContent =
        "Localizando...";

    navigator.geolocation.getCurrentPosition(
        async (posicao) => {
            const latitude =
                posicao.coords.latitude;

            const longitude =
                posicao.coords.longitude;

            const localizacao =
                await obterEnderecoLocalizacaoAtual(
                    latitude,
                    longitude
                );

            const campoPesquisa =
                document.getElementById("mapSearch");

            if (campoPesquisa) {
                campoPesquisa.value =
                    localizacao.enderecoPesquisa;
            }

            selecionarLocalizacaoMapa(localizacao, 16, true);

            botao.disabled = false;
            botao.textContent =
                textoOriginal;
        },

        (erro) => {
            console.error(
                "Erro de localização:",
                erro
            );

            exibirMensagemMapa(
                mensagemErroLocalizacao(
                    erro
                ),
                "erro"
            );

            botao.disabled = false;
            botao.textContent =
                textoOriginal;
        },

        {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 60000
        }
    );
}

async function obterEnderecoLocalizacaoAtual(latitude, longitude) {
    const localizacaoPadrao = {
        titulo: "Minha localização",
        detalhes: "Posição atual",
        cidade: "sua localização",
        estado: "",
        latitude,
        longitude,
        enderecoPesquisa: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    };

    try {
        const url =
            "https://nominatim.openstreetmap.org/reverse" +
            `?format=jsonv2&addressdetails=1&accept-language=pt-BR` +
            `&lat=${encodeURIComponent(latitude)}` +
            `&lon=${encodeURIComponent(longitude)}`;
        const resposta = await fetch(url, {
            headers: { "Accept": "application/json" }
        });

        if (!resposta.ok) return localizacaoPadrao;

        const dados = await resposta.json();
        const endereco = dados.address || {};
        const rua =
            endereco.road || endereco.pedestrian || endereco.residential || "";
        const numero = endereco.house_number || "";
        const bairro =
            endereco.suburb || endereco.neighbourhood || endereco.city_district || "";
        const cidade =
            endereco.city || endereco.town || endereco.municipality ||
            endereco.village || "";
        const estado = String(
            endereco["ISO3166-2-lvl4"] || endereco.state || ""
        ).replace(/^BR-/, "");
        const cep = endereco.postcode || "";
        const logradouro = [rua, numero].filter(Boolean).join(", ");
        const enderecoPesquisa = [logradouro, bairro, cidade, estado, cep]
            .filter(Boolean)
            .join(" - ");

        return {
            titulo: logradouro || bairro || "Minha localização",
            detalhes: [bairro, cidade, estado, cep].filter(Boolean).join(" - "),
            cidade: cidade || "sua localização",
            estado,
            latitude,
            longitude,
            enderecoPesquisa:
                enderecoPesquisa || localizacaoPadrao.enderecoPesquisa
        };
    } catch (erro) {
        console.warn("Não foi possível identificar o endereço atual:", erro);
        return localizacaoPadrao;
    }
}

function mensagemErroLocalizacao(
    erro
) {
    if (
        erro.code ===
        erro.PERMISSION_DENIED
    ) {
        return "A permissão de localização foi negada.";
    }

    if (
        erro.code ===
        erro.POSITION_UNAVAILABLE
    ) {
        return "Sua localização não está disponível.";
    }

    if (
        erro.code ===
        erro.TIMEOUT
    ) {
        return "A localização demorou muito para responder.";
    }

    return "Não foi possível obter sua localização.";
}

/* Ajuste da visualização */

function ajustarVisualizacaoMapa(
    pontos
) {
    if (!mapa) {
        return;
    }

    if (!pontos.length) {
        mapa.setView(
            [
                centroInicial.latitude,
                centroInicial.longitude
            ],
            centroInicial.zoom
        );

        return;
    }

    if (pontos.length === 1) {
        mapa.setView(
            [
                Number(
                    pontos[0].latitude
                ),
                Number(
                    pontos[0].longitude
                )
            ],
            15
        );

        return;
    }

    const limites =
        L.latLngBounds(
            pontos.map(
                (ponto) => [
                    Number(
                        ponto.latitude
                    ),
                    Number(
                        ponto.longitude
                    )
                ]
            )
        );

    mapa.fitBounds(
        limites,
        {
            padding: [45, 45],
            maxZoom: 15
        }
    );
}

/* Endereço e rotas */

function montarEnderecoExibicao(
    ponto
) {
    const ruaNumero = [
        ponto.rua,
        ponto.numero
    ]
        .filter(Boolean)
        .join(", ");

    const localidade = [
        ponto.bairro,
        ponto.cidade,
        ponto.estado
    ]
        .filter(Boolean)
        .join(" - ");

    return [
        ruaNumero ||
            ponto.endereco,
        localidade
    ]
        .filter(Boolean)
        .join(" • ") ||
        "Endereço não informado";
}

function criarUrlComoChegar(ponto) {
    if (possuiCoordenadas(ponto)) {
        return (
            "https://www.google.com/maps/dir/?api=1" +
            `&destination=${encodeURIComponent(
                `${ponto.latitude},${ponto.longitude}`
            )}`
        );
    }

    const endereco =
        montarEnderecoGeocodificacao(
            ponto
        );

    return (
        "https://www.google.com/maps/search/?api=1" +
        `&query=${encodeURIComponent(
            endereco ||
                ponto.nome ||
                ""
        )}`
    );
}

/* Mensagens e utilidades */

function atualizarTotalPontos(
    total
) {
    const elemento =
        document.getElementById(
            "mapTotalPontos"
        );

    if (elemento) {
        elemento.textContent =
            total;
    }
}

function exibirMensagemMapa(
    texto,
    tipo
) {
    const mensagem =
        document.getElementById(
            "mapMensagem"
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

function limparMensagemMapa() {
    const mensagem =
        document.getElementById(
            "mapMensagem"
        );

    if (!mensagem) {
        return;
    }

    mensagem.textContent = "";
    mensagem.className =
        "form-message";
}

function normalizarStatus(status) {
    return String(
        status || ""
    )
        .trim()
        .toUpperCase();
}

function normalizarTexto(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
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

function configurarInformacoesMapa() {
    const modal = document.createElement("div");
    modal.className = "contact-modal";
    modal.id = "modalInformacoesMapa";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
        <div class="contact-modal__overlay" data-fechar-informacoes></div>
        <div class="contact-modal__content" role="dialog" aria-modal="true" aria-labelledby="informacoesMapaTitulo">
            <button type="button" class="contact-modal__close" data-fechar-informacoes aria-label="Fechar">&times;</button>
            <span class="label">Informações do ponto</span>
            <h2 id="informacoesMapaTitulo">Ponto de coleta</h2>
            <div id="informacoesMapaConteudo" class="contact-modal__details"></div>
            <div class="contact-modal__actions">
                <a id="informacoesMapaRota" class="btn btn--primary contact-modal__route" target="_blank" rel="noopener noreferrer">Como chegar</a>
                <button type="button" class="btn btn--outline-green" data-fechar-informacoes>Fechar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.addEventListener("click", (evento) => {
        const botao = evento.target.closest(".btnInformacoesMapa");
        if (botao) {
            const ponto = pontosPublicos.find(
                (item) => String(item.id) === String(botao.dataset.id)
            );
            if (ponto) abrirInformacoesMapa(ponto);
        }

        if (evento.target.closest("[data-fechar-informacoes]")) {
            fecharInformacoesMapa();
        }
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") fecharInformacoesMapa();
    });
}

function abrirInformacoesMapa(ponto) {
    const modal = document.getElementById("modalInformacoesMapa");
    const conteudo = document.getElementById("informacoesMapaConteudo");
    const titulo = document.getElementById("informacoesMapaTitulo");
    const rota = document.getElementById("informacoesMapaRota");
    const telefone = ponto.telefone || "Não informado";
    const numeroWhatsApp = limparTelefone(ponto.telefone);
    const whatsapp = numeroWhatsApp
        ? `https://wa.me/${numeroWhatsApp.startsWith("55") ? numeroWhatsApp : `55${numeroWhatsApp}`}`
        : "";
    const materiais = obterMateriaisMapa(ponto);

    titulo.textContent = ponto.nome || "Ponto de coleta";
    rota.href = criarUrlComoChegar(ponto);
    conteudo.innerHTML = `
        ${criarItemInformacaoMapa("phone", "Telefone", whatsapp
            ? `<a class="contact-modal__phone" href="${escaparHTML(whatsapp)}" target="_blank" rel="noopener noreferrer">${escaparHTML(telefone)}</a>`
            : `<strong>${escaparHTML(telefone)}</strong>`, "☎")}
        ${criarItemInformacaoMapa("address", "Endereço", `<strong>${escaparHTML(montarEnderecoExibicao(ponto))}</strong><p>${escaparHTML(ponto.cep || "CEP não informado")}</p>`, "⌖")}
        ${criarItemInformacaoMapa("schedule", "Horário de funcionamento", `<strong>${escaparHTML(ponto.horario_funcionamento || "Não informado")}</strong>`, "◷")}
        ${criarItemInformacaoMapa("materials", "Materiais aceitos", `<div class="contact-modal__materials-list">${renderizarMateriaisMapa(materiais)}</div>`, "▣")}
    `;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function criarItemInformacaoMapa(classe, titulo, conteudo, icone) {
    return `<div class="contact-modal__item contact-modal__item--${classe}">
        <div class="contact-modal__icon" aria-hidden="true">${icone}</div>
        <div class="contact-modal__item-content"><span>${titulo}</span>${conteudo}</div>
    </div>`;
}

function obterMateriaisMapa(ponto) {
    if (Array.isArray(ponto.materiais)) return ponto.materiais;
    if (typeof ponto.materiais === "string") {
        return ponto.materiais.split(",").map((nome) => nome.trim()).filter(Boolean);
    }
    return [];
}

function renderizarMateriaisMapa(materiais) {
    if (!materiais.length) return `<span class="public-point-card__empty-material">Não informado</span>`;
    return materiais.map((material) => {
        const nome = typeof material === "string" ? material : material.nome;
        return `<span class="public-point-card__chip">${escaparHTML(nome || "Material")}</span>`;
    }).join("");
}

function fecharInformacoesMapa() {
    const modal = document.getElementById("modalInformacoesMapa");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}
