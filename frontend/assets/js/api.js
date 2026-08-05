const API_URL = (() => {
    const configurada = String(
        window.ELIXO_API_URL || ""
    ).trim();

    if (configurada) {
        return configurada.replace(/\/$/, "");
    }

    if (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
    ) {
        return `${window.location.protocol}//${window.location.hostname}:3001/api`;
    }

    return "/api";
})();

function redirecionarSeAutenticado() {
    if (!localStorage.getItem("token")) {
        return false;
    }

    window.location.replace("index.html");

    return true;
}

async function api(url, options = {}) {

    const token = localStorage.getItem("token");

    const headers = {
        "Content-Type": "application/json",
        ...options.headers
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const resposta = await fetch(API_URL + url, {
        ...options,
        headers
    });

    const tipoConteudo =
        resposta.headers.get("content-type") || "";
    const dados = tipoConteudo.includes("application/json")
        ? await resposta.json()
        : {};

    if (!resposta.ok) {
        throw new Error(dados.erro || "Erro na API.");
    }

    return dados;

}

/* Autenticação */

async function login(email, senha) {

    const dados = await api("/auth/login", {

        method: "POST",

        body: JSON.stringify({

            email,
            senha

        })

    });

    localStorage.setItem("token", dados.token);

    return dados;

}

async function cadastrar(nome, email, senha) {

    return await api("/auth/register", {

        method: "POST",

        body: JSON.stringify({

            nome,
            email,
            senha

        })

    });

}

async function obterMeuPerfil() {

    return await api("/auth/me");

}

async function atualizarMeuPerfil(perfil) {

    return await api("/auth/me", {

        method: "PUT",

        body: JSON.stringify(perfil)

    });

}

async function alterarMinhaSenha(dados) {

    return await api("/auth/me/senha", {

        method: "PUT",

        body: JSON.stringify(dados)

    });

}

async function solicitarRecuperacaoSenha(email) {

    return await api("/auth/esqueci-senha", {

        method: "POST",

        body: JSON.stringify({
            email
        })

    });

}

async function redefinirSenha(dados) {

    return await api("/auth/redefinir-senha", {

        method: "POST",

        body: JSON.stringify(dados)

    });

}

/* Pontos */

async function listarPontos() {

    return await api("/pontos");

}

async function criarPonto(ponto) {

    return await api("/pontos", {

        method: "POST",

        body: JSON.stringify(ponto)

    });

}

async function solicitarExclusaoPonto(id, motivo) {

    return await api(`/pontos/${id}/solicitar-exclusao`, {

        method: "POST",

        body: JSON.stringify({
            motivo
        })

    });

}

async function atualizarPonto(id, ponto) {

    return await api(`/pontos/${id}`, {

        method: "PUT",

        body: JSON.stringify(ponto)

    });

}

async function excluirPonto(id) {

    return await api(`/pontos/${id}`, {

        method: "DELETE"

    });

}

/* Usuários */

async function listarUsuarios() {

    return await api("/usuarios");

}
