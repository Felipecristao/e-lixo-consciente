document.addEventListener("DOMContentLoaded", () => {
    iniciarPerfil();
});

let cepConsultado = "";
let buscaCepController = null;

async function iniciarPerfil() {
    if (!protegerPagina()) {
        return;
    }

    configurarBotaoSair();
    configurarBuscaCep();
    configurarFormulario();
    configurarFormularioSenha();

    await carregarPerfil();
}

function protegerPagina() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "login.html";
        return false;
    }

    return true;
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

        window.location.href = "index.html";
    });
}

function configurarFormulario() {
    const formulario =
        document.getElementById("perfilForm");

    formulario.addEventListener(
        "submit",
        async (evento) => {
            evento.preventDefault();

            if (!validarFormulario()) {
                return;
            }

            await salvarPerfil();
        }
    );
}

function configurarFormularioSenha() {
    const formulario =
        document.getElementById("senhaForm");

    if (!formulario) {
        return;
    }

    formulario.addEventListener(
        "submit",
        async (evento) => {
            evento.preventDefault();
            await salvarNovaSenha();
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

async function carregarPerfil() {
    exibirMensagem(
        "Carregando perfil...",
        "normal"
    );

    try {
        const perfil =
            await obterMeuPerfil();

        configurarLinkPainel(perfil);
        preencherFormulario(perfil);
        atualizarUsuarioLocal(perfil);
        limparMensagem();
    } catch (erro) {
        exibirMensagem(
            erro.message ||
                "Erro ao carregar o perfil.",
            "erro"
        );
    }
}

function configurarLinkPainel(perfil) {
    const link = document.getElementById("linkVoltarPainel");

    if (link && perfil?.perfil === "ADMIN") {
        link.href = "admin-dashboard.html";
        link.textContent = "Painel administrador";
        link.classList.remove("header-login-btn");
        link.classList.add("admin-profile-btn");
    }
}

function preencherFormulario(perfil) {
    preencherCampo("nome", perfil.nome);
    preencherCampo("email", perfil.email);
    preencherCampo("telefone", perfil.telefone);
    preencherCampo(
        "dataNascimento",
        perfil.data_nascimento
    );
    preencherCampo(
        "cep",
        formatarCep(perfil.cep)
    );
    preencherCampo("rua", perfil.rua);
    preencherCampo("numero", perfil.numero);
    preencherCampo("bairro", perfil.bairro);
    preencherCampo("cidade", perfil.cidade);
    preencherCampo("estado", perfil.estado);
    preencherCampo(
        "complemento",
        perfil.complemento
    );
}

function preencherCampo(id, valor) {
    const campo =
        document.getElementById(id);

    if (campo) {
        campo.value = valor || "";
    }
}

function validarFormulario() {
    limparMensagem();

    const nome =
        document
            .getElementById("nome")
            .value
            .trim();

    if (!nome) {
        exibirMensagem(
            "Informe o nome.",
            "erro"
        );

        document
            .getElementById("nome")
            .focus();

        return false;
    }

    const cep =
        obterDigitosCep(
            document
                .getElementById("cep")
                .value
        );

    if (
        cep.length > 0 &&
        cep.length !== 8
    ) {
        exibirMensagem(
            "Informe um CEP valido com 8 numeros.",
            "erro"
        );

        document
            .getElementById("cep")
            .focus();

        return false;
    }

    const estado =
        document
            .getElementById("estado")
            .value
            .trim();

    if (
        estado &&
        estado.length !== 2
    ) {
        exibirMensagem(
            "Informe a sigla do estado com 2 letras.",
            "erro"
        );

        document
            .getElementById("estado")
            .focus();

        return false;
    }

    return true;
}

async function salvarPerfil() {
    const btnSalvar =
        document.getElementById(
            "btnSalvarPerfil"
        );

    btnSalvar.disabled = true;
    btnSalvar.textContent = "Salvando...";

    exibirMensagem(
        "Salvando alteracoes...",
        "normal"
    );

    const perfil = {
        nome: obterValor("nome"),
        telefone: obterValor("telefone"),
        data_nascimento:
            obterValor("dataNascimento"),
        cep: formatarCep(obterValor("cep")),
        rua: obterValor("rua"),
        numero: obterValor("numero"),
        bairro: obterValor("bairro"),
        cidade: obterValor("cidade"),
        estado: obterValor("estado").toUpperCase(),
        complemento: obterValor("complemento")
    };

    try {
        const resposta =
            await atualizarMeuPerfil(perfil);

        const usuario =
            resposta.usuario || perfil;

        preencherFormulario(usuario);
        atualizarUsuarioLocal(usuario);

        exibirMensagem(
            resposta.mensagem ||
                "Perfil atualizado com sucesso.",
            "sucesso"
        );
    } catch (erro) {
        exibirMensagem(
            erro.message ||
                "Erro ao salvar o perfil.",
            "erro"
        );
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent =
            "Salvar alteracoes";
    }
}

function obterValor(id) {
    return document
        .getElementById(id)
        .value
        .trim();
}

function atualizarUsuarioLocal(usuario) {
    const usuarioSalvo =
        localStorage.getItem("usuario");

    let dadosAtuais = {};

    if (usuarioSalvo) {
        try {
            dadosAtuais =
                JSON.parse(usuarioSalvo);
        } catch (erro) {
            dadosAtuais = {};
        }
    }

    localStorage.setItem(
        "usuario",
        JSON.stringify({
            ...dadosAtuais,
            id: usuario.id || dadosAtuais.id,
            nome: usuario.nome,
            email:
                usuario.email ||
                dadosAtuais.email,
            perfil:
                usuario.perfil ||
                dadosAtuais.perfil
        })
    );
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

        document
            .getElementById("numero")
            .focus();
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
            if (valor) {
                preencherCampo(campoId, valor);
            }
        }
    );
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

function obterDigitosCep(valor) {
    return String(valor || "")
        .replace(/\D/g, "")
        .slice(0, 8);
}

function exibirMensagem(texto, tipo) {
    const mensagem =
        document.getElementById(
            "perfilMensagem"
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
            "perfilMensagem"
        );

    mensagem.textContent = "";
    mensagem.className = "form-message";
}

async function salvarNovaSenha() {
    const senhaAtual =
        obterValor("senhaAtual");

    const novaSenha =
        obterValor("novaSenha");

    const confirmarNovaSenha =
        obterValor("confirmarNovaSenha");

    const btnSalvar =
        document.getElementById(
            "btnSalvarSenha"
        );

    limparMensagemSenha();

    if (
        !senhaAtual ||
        !novaSenha ||
        !confirmarNovaSenha
    ) {
        exibirMensagemSenha(
            "Preencha todos os campos.",
            "erro"
        );

        return;
    }

    if (novaSenha.length < 8) {
        exibirMensagemSenha(
            "A nova senha deve ter pelo menos 8 caracteres.",
            "erro"
        );

        return;
    }

    if (novaSenha !== confirmarNovaSenha) {
        exibirMensagemSenha(
            "A confirmação da senha não confere.",
            "erro"
        );

        return;
    }

    btnSalvar.disabled = true;
    btnSalvar.textContent = "Alterando...";

    try {
        const resposta =
            await alterarMinhaSenha({
                senha_atual: senhaAtual,
                nova_senha: novaSenha,
                confirmar_senha: confirmarNovaSenha
            });

        document
            .getElementById("senhaForm")
            .reset();

        exibirMensagemSenha(
            resposta.mensagem ||
                "Senha alterada com sucesso.",
            "sucesso"
        );
    } catch (erro) {
        exibirMensagemSenha(
            erro.message ||
                "Erro ao alterar a senha.",
            "erro"
        );
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent =
            "Alterar senha";
    }
}

function exibirMensagemSenha(texto, tipo) {
    const mensagem =
        document.getElementById(
            "senhaMensagem"
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

function limparMensagemSenha() {
    const mensagem =
        document.getElementById(
            "senhaMensagem"
        );

    if (!mensagem) {
        return;
    }

    mensagem.textContent = "";
    mensagem.className = "form-message";
}
