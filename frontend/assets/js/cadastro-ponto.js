document.addEventListener("DOMContentLoaded", () => {
    iniciarCadastroPonto();
});

let etapaAtual = 1;
const totalEtapas = 4;
let cepConsultado = "";
let buscaCepController = null;

async function iniciarCadastroPonto() {
    if (!protegerPagina()) {
        return;
    }

    configurarNavegacaoPorPerfil();
    configurarBotoes();
    configurarFormulario();
    configurarBuscaCep();
    configurarBotaoSair();

    atualizarEtapa();

    await Promise.all([
        carregarTiposPonto(),
        carregarMateriais()
    ]);
}

function protegerPagina() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "login.html";
        return false;
    }

    return true;
}

function configurarNavegacaoPorPerfil() {
    let usuario = null;

    try {
        usuario = JSON.parse(
            localStorage.getItem("usuario") || "null"
        );
    } catch (erro) {
        usuario = null;
    }

    if (usuario?.perfil !== "ADMIN") {
        return;
    }

    const link = document.getElementById("linkPainelCadastro");

    if (link) {
        link.href = "admin-dashboard.html";
        link.textContent = "Painel administrador";
        link.classList.remove("header-login-btn");
        link.classList.add("admin-profile-btn");
    }

    const btnEnviar = document.getElementById("btnEnviar");
    const resumoTitulo = document.getElementById("resumoEnvioTitulo");
    const resumoTexto = document.getElementById("resumoEnvioTexto");

    if (btnEnviar) {
        btnEnviar.textContent = "Cadastrar e publicar";
    }

    if (resumoTitulo) {
        resumoTitulo.textContent = "Publicação imediata";
    }

    if (resumoTexto) {
        resumoTexto.textContent =
            "Como administrador, o ponto será publicado automaticamente após o cadastro.";
    }
}

function configurarBotoes() {
    const btnAnterior =
        document.getElementById("btnAnterior");

    const btnProximo =
        document.getElementById("btnProximo");

    btnAnterior.addEventListener("click", () => {
        if (etapaAtual > 1) {
            etapaAtual--;
            atualizarEtapa();
        }
    });

    btnProximo.addEventListener("click", () => {
        if (!validarEtapa(etapaAtual)) {
            return;
        }

        if (etapaAtual < totalEtapas) {
            etapaAtual++;
            atualizarEtapa();
        }
    });
}

function configurarFormulario() {
    const formulario =
        document.getElementById("pontoForm");
    const nome =
        document.getElementById("nome");

    nome.addEventListener("input", () => {
        const inicioSelecao = nome.selectionStart;
        const fimSelecao = nome.selectionEnd;

        nome.value = nome.value.toUpperCase();
        nome.setSelectionRange(
            inicioSelecao,
            fimSelecao
        );
    });

    formulario.addEventListener(
        "submit",
        async (evento) => {
            evento.preventDefault();

            if (etapaAtual !== totalEtapas) {
                return;
            }

            if (!validarEtapa(etapaAtual)) {
                return;
            }

            await enviarPonto();
        }
    );
}

function configurarBuscaCep() {
    const cep =
        document.getElementById("cep");

    const estado =
        document.getElementById("estado");

    cep.addEventListener("input", () => {
        const cepFormatado =
            formatarCep(cep.value);

        cep.value = cepFormatado;

        const digitos =
            obterDigitosCep(cepFormatado);

        if (digitos.length < 8) {
            cepConsultado = "";
            atualizarStatusCep("");

            return;
        }

        buscarEnderecoPorCep(digitos);
    });

    cep.addEventListener("blur", () => {
        const digitos =
            obterDigitosCep(cep.value);

        if (digitos.length === 8) {
            buscarEnderecoPorCep(digitos);
        }
    });

    estado.addEventListener("input", () => {
        estado.value = estado.value
            .replace(/[^a-zA-Z]/g, "")
            .slice(0, 2)
            .toUpperCase();
    });
}

function configurarBotaoSair() {
    const btnSair =
        document.getElementById("btnSair");

    if (!btnSair) {
        return;
    }

    btnSair.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");

        window.location.href = "login.html";
    });
}

async function carregarTiposPonto() {
    const select =
        document.getElementById("tipoPonto");

    try {
        const tipos = await api("/tipos-ponto");

        select.innerHTML = `
            <option value="">
                Selecione o tipo do ponto
            </option>
        `;

        tipos
            .filter(
                (tipo) =>
                    String(tipo.nome || "")
                        .trim()
                        .toUpperCase() !== "ECOPONTO"
            )
            .forEach((tipo) => {
            const option =
                document.createElement("option");

            option.value = tipo.id;
            option.textContent = tipo.nome;

                select.appendChild(option);
            });
    } catch (erro) {
        select.innerHTML = `
            <option value="">
                Não foi possível carregar os tipos
            </option>
        `;

        exibirMensagem(
            erro.message ||
                "Erro ao carregar os tipos de ponto.",
            "erro"
        );
    }
}

async function carregarMateriais() {
    const container =
        document.getElementById(
            "materiaisContainer"
        );

    try {
        const materiais =
            await api("/materiais");

        container.innerHTML = "";

        materiais.forEach((material) => {
            const label =
                document.createElement("label");

            label.className = "material-option";

            label.innerHTML = `
                <input
                    type="checkbox"
                    name="materiais"
                    value="${material.id}"
                >

                <span
                    class="material-option__check"
                ></span>

                <span
                    class="material-option__name"
                >
                    ${escaparHTML(material.nome)}
                </span>
            `;

            container.appendChild(label);
        });
    } catch (erro) {
        container.innerHTML = `
            <p>
                Não foi possível carregar os materiais.
            </p>
        `;

        exibirMensagem(
            erro.message ||
                "Erro ao carregar os materiais.",
            "erro"
        );
    }
}

function atualizarEtapa() {
    const paineis =
        document.querySelectorAll(
            ".wizard-panel"
        );

    const indicadores =
        document.querySelectorAll(
            ".wizard-step"
        );

    paineis.forEach((painel) => {
        const etapaPainel =
            Number(painel.dataset.etapa);

        painel.classList.toggle(
            "is-active",
            etapaPainel === etapaAtual
        );
    });

    indicadores.forEach((indicador) => {
        const etapaIndicador =
            Number(
                indicador.dataset.indicador
            );

        indicador.classList.toggle(
            "is-active",
            etapaIndicador === etapaAtual
        );

        indicador.classList.toggle(
            "is-complete",
            etapaIndicador < etapaAtual
        );
    });

    const btnAnterior =
        document.getElementById(
            "btnAnterior"
        );

    const btnProximo =
        document.getElementById(
            "btnProximo"
        );

    const btnEnviar =
        document.getElementById(
            "btnEnviar"
        );

    // Exibe apenas as ações que fazem sentido na etapa atual.

    btnAnterior.style.display =
        etapaAtual > 1
            ? "inline-flex"
            : "none";

    btnProximo.style.display =
        etapaAtual < totalEtapas
            ? "inline-flex"
            : "none";

    btnEnviar.style.display =
        etapaAtual === totalEtapas
            ? "inline-flex"
            : "none";

    limparMensagem();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function validarEtapa(etapa) {
    limparMensagem();

    if (etapa === 1) {
        const nome =
            document
                .getElementById("nome")
                .value
                .trim();

        const tipoPonto =
            document
                .getElementById("tipoPonto")
                .value;

        if (!nome) {
            exibirMensagem(
                "Informe o nome do ponto.",
                "erro"
            );

            return false;
        }

        if (!tipoPonto) {
            exibirMensagem(
                "Selecione o tipo do ponto.",
                "erro"
            );

            return false;
        }
    }

    if (etapa === 2) {
        const camposObrigatorios = [
            ["rua", "Informe a rua."],
            ["numero", "Informe o número."],
            ["bairro", "Informe o bairro."],
            ["cidade", "Informe a cidade."],
            ["estado", "Informe o estado."]
        ];

        const cep =
            obterDigitosCep(
                document
                    .getElementById("cep")
                    .value
            );

        if (cep.length !== 8) {
            exibirMensagem(
                "Informe um CEP valido com 8 numeros.",
                "erro"
            );

            document
                .getElementById("cep")
                .focus();

            return false;
        }

        for (
            const [campoId, mensagem]
            of camposObrigatorios
        ) {
            const campo =
                document.getElementById(campoId);

            const valor =
                campo.value.trim();

            if (!valor) {
                exibirMensagem(
                    mensagem,
                    "erro"
                );

                campo.focus();

                return false;
            }
        }

        const estado =
            document
                .getElementById("estado")
                .value
                .trim();

        if (estado.length !== 2) {
            exibirMensagem(
                "Informe a sigla do estado com 2 letras.",
                "erro"
            );

            return false;
        }
    }

    if (etapa === 3) {
        const materiaisSelecionados =
            document.querySelectorAll(
                'input[name="materiais"]:checked'
            );

        if (
            materiaisSelecionados.length === 0
        ) {
            exibirMensagem(
                "Selecione pelo menos um material.",
                "erro"
            );

            return false;
        }
    }

    if (etapa === 4) {
        const telefone =
            document
                .getElementById("telefone")
                .value
                .trim();

        if (!telefone) {
            exibirMensagem(
                "Informe o telefone do ponto.",
                "erro"
            );

            document
                .getElementById("telefone")
                .focus();

            return false;
        }

        const diasFuncionamento =
            document.querySelectorAll(
                'input[name="diasFuncionamento"]:checked'
            );
        const horarioAbertura =
            document.getElementById("horarioAbertura").value;
        const horarioFechamento =
            document.getElementById("horarioFechamento").value;

        if (!diasFuncionamento.length) {
            exibirMensagem(
                "Selecione pelo menos um dia de funcionamento.",
                "erro"
            );
            return false;
        }

        if (!horarioAbertura || !horarioFechamento) {
            exibirMensagem(
                "Informe os horários de abertura e fechamento.",
                "erro"
            );
            document.getElementById(
                !horarioAbertura ? "horarioAbertura" : "horarioFechamento"
            ).focus();
            return false;
        }

        if (horarioAbertura >= horarioFechamento) {
            exibirMensagem(
                "O horário de fechamento deve ser posterior ao de abertura.",
                "erro"
            );
            document.getElementById("horarioFechamento").focus();
            return false;
        }
    }

    return true;
}

async function enviarPonto() {
    const btnEnviar =
        document.getElementById("btnEnviar");

    btnEnviar.disabled = true;
    btnEnviar.textContent = "Enviando...";

    exibirMensagem(
        "Enviando ponto para análise...",
        "normal"
    );

    const materiais = Array.from(
        document.querySelectorAll(
            'input[name="materiais"]:checked'
        )
    ).map(
        (checkbox) =>
            Number(checkbox.value)
    );

    const ponto = {
        nome:
            document
                .getElementById("nome")
                .value
                .trim()
                .toUpperCase(),

        descricao:
            document
                .getElementById("descricao")
                .value
                .trim(),

        tipo_ponto_id:
            Number(
                document
                    .getElementById("tipoPonto")
                    .value
            ),

        cep:
            formatarCep(
                document
                    .getElementById("cep")
                    .value
            ),

        rua:
            document
                .getElementById("rua")
                .value
                .trim(),

        numero:
            document
                .getElementById("numero")
                .value
                .trim(),

        bairro:
            document
                .getElementById("bairro")
                .value
                .trim(),

        cidade:
            document
                .getElementById("cidade")
                .value
                .trim(),

        estado:
            document
                .getElementById("estado")
                .value
                .trim()
                .toUpperCase(),

        telefone:
            document
                .getElementById("telefone")
                .value
                .trim(),

        horario_funcionamento:
            formatarHorarioFuncionamento(),

        site:
            document
                .getElementById("site")
                .value
                .trim(),

        observacoes:
            document
                .getElementById("observacoes")
                .value
                .trim(),

        materiais
    };

    try {
        const resposta = await api(
            "/pontos",
            {
                method: "POST",
                body: JSON.stringify(ponto)
            }
        );

        exibirMensagem(
            resposta.mensagem ||
                "Ponto enviado para análise.",
            "sucesso"
        );

        setTimeout(() => {
            window.location.href = ehAdministradorLocal()
                ? "admin-dashboard.html"
                : "dashboard.html";
        }, 1400);
    } catch (erro) {
        exibirMensagem(
            erro.message ||
                "Erro ao enviar o ponto.",
            "erro"
        );

        btnEnviar.disabled = false;

        btnEnviar.textContent = ehAdministradorLocal()
            ? "Cadastrar e publicar"
            : "Enviar para análise";
    }
}

function exibirMensagem(texto, tipo) {
    const mensagem =
        document.getElementById(
            "pontoMensagem"
        );

    mensagem.textContent = texto;
    mensagem.className = "form-message";

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
            "pontoMensagem"
        );

    mensagem.textContent = "";
    mensagem.className = "form-message";
}

function ehAdministradorLocal() {
    try {
        return JSON.parse(
            localStorage.getItem("usuario") || "null"
        )?.perfil === "ADMIN";
    } catch (erro) {
        return false;
    }
}

async function buscarEnderecoPorCep(cep) {
    if (
        cep.length !== 8 ||
        cep === cepConsultado
    ) {
        return;
    }

    cepConsultado = cep;

    if (buscaCepController) {
        buscaCepController.abort();
    }

    buscaCepController =
        new AbortController();

    atualizarStatusCep(
        "Buscando endereco...",
        "normal"
    );

    try {
        const resposta = await fetch(
            `https://viacep.com.br/ws/${cep}/json/`,
            {
                signal:
                    buscaCepController.signal
            }
        );

        if (!resposta.ok) {
            throw new Error(
                "Nao foi possivel consultar o CEP."
            );
        }

        const endereco =
            await resposta.json();

        if (endereco.erro) {
            cepConsultado = "";
            limparEnderecoViaCep();
            atualizarStatusCep(
                "CEP nao encontrado.",
                "erro"
            );

            return;
        }

        preencherEnderecoViaCep(endereco);

        atualizarStatusCep(
            "Endereco preenchido automaticamente.",
            "sucesso"
        );

        const numero =
            document.getElementById("numero");

        numero.focus();
    } catch (erro) {
        if (erro.name === "AbortError") {
            return;
        }

        cepConsultado = "";

        atualizarStatusCep(
            erro.message ||
                "Erro ao consultar o CEP.",
            "erro"
        );
    }
}

function preencherEnderecoViaCep(endereco) {
    const campos = {
        rua: endereco.logradouro,
        bairro: endereco.bairro,
        cidade: endereco.localidade,
        estado: endereco.uf
    };

    Object.entries(campos).forEach(
        ([campoId, valor]) => {
            const campo =
                document.getElementById(campoId);

            if (valor) {
                campo.value = valor;
            }
        }
    );
}

function limparEnderecoViaCep() {
    [
        "rua",
        "bairro",
        "cidade",
        "estado"
    ].forEach((campoId) => {
        document.getElementById(
            campoId
        ).value = "";
    });
}

function atualizarStatusCep(texto, tipo) {
    const status =
        document.getElementById("cepStatus");

    if (!status) {
        return;
    }

    status.textContent = texto;
    status.className = "cep-status";

    if (tipo === "erro") {
        status.classList.add(
            "cep-status--error"
        );
    }

    if (tipo === "sucesso") {
        status.classList.add(
            "cep-status--success"
        );
    }
}

function formatarCep(valor) {
    const digitos =
        obterDigitosCep(valor);

    if (digitos.length <= 5) {
        return digitos;
    }

    return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

function formatarHorarioFuncionamento() {
    const dias = Array.from(
        document.querySelectorAll(
            'input[name="diasFuncionamento"]:checked'
        )
    ).map((campo) => campo.value);
    const abertura =
        document.getElementById("horarioAbertura").value;
    const fechamento =
        document.getElementById("horarioFechamento").value;

    let descricaoDias = dias.join(", ");

    if (dias.length === 7) {
        descricaoDias = "Todos os dias";
    } else if (
        dias.length === 5 &&
        dias[0] === "Segunda-feira" &&
        dias[4] === "Sexta-feira"
    ) {
        descricaoDias = "Segunda a sexta";
    } else if (
        dias.length === 2 &&
        dias[0] === "Sábado" &&
        dias[1] === "Domingo"
    ) {
        descricaoDias = "Sábado e domingo";
    }

    return `${descricaoDias}, das ${abertura} às ${fechamento}`;
}

function obterDigitosCep(valor) {
    return String(valor || "")
        .replace(/\D/g, "")
        .slice(0, 8);
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
