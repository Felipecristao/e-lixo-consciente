require("dotenv").config();

const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const db = require("../config/database");

const baseUrl = process.env.SMOKE_API_URL || "http://127.0.0.1:3001/api";
const identificador = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
const emailUsuario = `smoke.usuario.${identificador}@example.invalid`;
const emailAdmin = `smoke.admin.${identificador}@example.invalid`;
const senhaUsuario = crypto.randomBytes(18).toString("base64url");
const novaSenhaUsuario = crypto.randomBytes(18).toString("base64url");
const senhaAdmin = crypto.randomBytes(18).toString("base64url");
const prefixoPonto = `SMOKE ${identificador}`.toUpperCase();

let usuarioId = null;
let adminId = null;

function conferir(condicao, mensagem) {
    if (!condicao) throw new Error(mensagem);
}

async function requisitar(caminho, {
    method = "GET",
    token,
    body,
    origin
} = {}) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (origin) headers.Origin = origin;

    const resposta = await fetch(`${baseUrl}${caminho}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    const texto = await resposta.text();
    let dados = null;

    if (texto) {
        try {
            dados = JSON.parse(texto);
        } catch {
            dados = texto;
        }
    }

    return { resposta, dados };
}

async function esperarStatus(caminho, status, opcoes) {
    const resultado = await requisitar(caminho, opcoes);
    conferir(
        resultado.resposta.status === status,
        `${opcoes?.method || "GET"} ${caminho}: esperado ${status}, recebido ${resultado.resposta.status}`
    );
    return resultado;
}

async function criarAdminTemporario() {
    const senhaHash = await bcrypt.hash(senhaAdmin, 10);
    const [resultado] = await db.execute(
        "INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, 'ADMIN')",
        ["Administrador de teste", emailAdmin, senhaHash]
    );
    adminId = resultado.insertId;
}

async function limparDados() {
    await db.execute(
        "DELETE FROM pontos_coleta WHERE nome LIKE ?",
        [`${prefixoPonto}%`]
    );
    await db.execute(
        "DELETE FROM recuperacao_senha WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN (?, ?))",
        [emailUsuario, emailAdmin]
    );
    await db.execute(
        "DELETE FROM usuarios WHERE email IN (?, ?)",
        [emailUsuario, emailAdmin]
    );
}

async function executar() {
    const etapas = [];

    try {
        await limparDados();
        await criarAdminTemporario();

        const health = await esperarStatus("/health", 200);
        conferir(health.dados?.banco === "conectado", "Banco não conectado");
        etapas.push("saúde da aplicação");

        const semToken = await esperarStatus("/admin/resumo", 401);
        conferir(!JSON.stringify(semToken.dados).includes("senha"), "Resposta indevida expôs senha");

        await esperarStatus("/admin/resumo", 401, { token: "token-invalido" });
        await esperarStatus("/pontos", 403, {
            origin: "https://origem-nao-permitida.invalid"
        });
        etapas.push("bloqueios sem autenticação, token inválido e CORS");

        const cadastro = await esperarStatus("/auth/register", 201, {
            method: "POST",
            body: {
                nome: "Usuário de teste",
                email: emailUsuario,
                senha: senhaUsuario
            }
        });
        const tokenUsuario = cadastro.dados?.token;
        usuarioId = cadastro.dados?.usuario?.id;
        conferir(tokenUsuario && usuarioId, "Cadastro não retornou sessão válida");
        conferir(!("senha" in cadastro.dados.usuario), "Cadastro expôs senha");

        await esperarStatus("/admin/resumo", 403, { token: tokenUsuario });
        const perfil = await esperarStatus("/auth/me", 200, { token: tokenUsuario });
        conferir(perfil.dados.email === emailUsuario, "Perfil incorreto");

        await esperarStatus("/auth/me", 200, {
            method: "PUT",
            token: tokenUsuario,
            body: {
                nome: "Usuário de teste atualizado",
                telefone: "46999999999",
                cep: "85501000",
                rua: "Rua de Teste",
                numero: "100",
                bairro: "Centro",
                cidade: "Pato Branco",
                estado: "PR"
            }
        });
        etapas.push("cadastro, sessão, perfil e autorização do usuário");

        const materiais = await esperarStatus("/materiais", 200);
        const tipos = await esperarStatus("/tipos-ponto", 200);
        const materialId = materiais.dados?.[0]?.id;
        const tipoId = tipos.dados?.[0]?.id;
        conferir(materialId && tipoId, "Catálogos sem dados para o teste");

        const incompleto = await esperarStatus("/pontos", 400, {
            method: "POST",
            token: tokenUsuario,
            body: { nome: `${prefixoPonto} INCOMPLETO` }
        });
        conferir(!JSON.stringify(incompleto.dados).includes(tokenUsuario), "Erro expôs token");

        const pontoRejeitado = await esperarStatus("/pontos", 201, {
            method: "POST",
            token: tokenUsuario,
            body: montarPonto(`${prefixoPonto} REJEITADO`, tipoId, materialId)
        });
        conferir(pontoRejeitado.dados?.ponto?.status === "PENDENTE", "Ponto do usuário não ficou pendente");
        const pontoRejeitadoId = pontoRejeitado.dados.ponto.id;

        const pontoAprovado = await esperarStatus("/pontos", 201, {
            method: "POST",
            token: tokenUsuario,
            body: montarPonto(`${prefixoPonto} APROVADO`, tipoId, materialId)
        });
        const pontoAprovadoId = pontoAprovado.dados.ponto.id;

        const loginAdmin = await esperarStatus("/auth/login", 200, {
            method: "POST",
            body: { email: emailAdmin, senha: senhaAdmin }
        });
        const tokenAdmin = loginAdmin.dados?.token;
        conferir(tokenAdmin, "Login administrativo sem token");

        const usuariosAdmin = await esperarStatus("/usuarios", 200, {
            token: tokenAdmin
        });
        conferir(
            usuariosAdmin.dados.some((usuario) => usuario.id === usuarioId),
            "Usuário temporário não apareceu na gestão administrativa"
        );
        conferir(
            !JSON.stringify(usuariosAdmin.dados).includes('"senha"'),
            "Listagem administrativa expôs senha"
        );
        await esperarStatus(`/usuarios/${adminId}/perfil`, 409, {
            method: "PATCH",
            token: tokenAdmin,
            body: { perfil: "USUARIO" }
        });
        await esperarStatus(`/usuarios/${usuarioId}/perfil`, 200, {
            method: "PATCH",
            token: tokenAdmin,
            body: { perfil: "ADMIN" }
        });
        await esperarStatus(`/usuarios/${usuarioId}/perfil`, 200, {
            method: "PATCH",
            token: tokenAdmin,
            body: { perfil: "USUARIO" }
        });
        etapas.push("gestão segura de perfis administrativos");

        await esperarStatus(`/admin/pontos/${pontoRejeitadoId}/rejeitar`, 200, {
            method: "PUT",
            token: tokenAdmin,
            body: { motivo: "Cadastro criado apenas para teste automatizado" }
        });
        await esperarStatus(`/admin/pontos/${pontoAprovadoId}/aprovar`, 200, {
            method: "PUT",
            token: tokenAdmin
        });

        const meus = await esperarStatus("/pontos/meus", 200, { token: tokenUsuario });
        conferir(
            meus.dados.some((ponto) => ponto.id === pontoRejeitadoId && ponto.status === "REJEITADO"),
            "Rejeição não apareceu no painel do usuário"
        );
        const publicos = await esperarStatus("/pontos", 200);
        conferir(publicos.dados.some((ponto) => ponto.id === pontoAprovadoId), "Ponto aprovado não ficou público");
        conferir(!publicos.dados.some((ponto) => ponto.id === pontoRejeitadoId), "Ponto rejeitado ficou público");
        etapas.push("cadastro, rejeição, aprovação e visibilidade pública");

        await esperarStatus(`/pontos/${pontoAprovadoId}/solicitar-exclusao`, 200, {
            method: "POST",
            token: tokenUsuario,
            body: { motivo: "Teste do fluxo de exclusão" }
        });
        await esperarStatus(`/admin/pontos/${pontoAprovadoId}/exclusao/rejeitar`, 200, {
            method: "PUT",
            token: tokenAdmin
        });
        await esperarStatus(`/pontos/${pontoAprovadoId}/solicitar-exclusao`, 200, {
            method: "POST",
            token: tokenUsuario,
            body: { motivo: "Segundo teste do fluxo de exclusão" }
        });
        await esperarStatus(`/admin/pontos/${pontoAprovadoId}/exclusao/aprovar`, 200, {
            method: "PUT",
            token: tokenAdmin
        });
        await esperarStatus(`/pontos/${pontoAprovadoId}`, 404);
        etapas.push("solicitação, rejeição e aprovação de exclusão");

        const pontoAdmin = await esperarStatus("/pontos", 201, {
            method: "POST",
            token: tokenAdmin,
            body: montarPonto(`${prefixoPonto} ADMIN`, tipoId, materialId)
        });
        conferir(pontoAdmin.dados?.ponto?.status === "APROVADO", "Cadastro administrativo não foi aprovado automaticamente");
        await esperarStatus(`/pontos/${pontoAdmin.dados.ponto.id}`, 200);
        etapas.push("cadastro direto pelo administrador");

        await esperarStatus("/auth/me/senha", 200, {
            method: "PUT",
            token: tokenUsuario,
            body: {
                senha_atual: senhaUsuario,
                nova_senha: novaSenhaUsuario,
                confirmar_senha: novaSenhaUsuario
            }
        });
        await esperarStatus("/auth/login", 401, {
            method: "POST",
            body: { email: emailUsuario, senha: senhaUsuario }
        });
        await esperarStatus("/auth/login", 200, {
            method: "POST",
            body: { email: emailUsuario, senha: novaSenhaUsuario }
        });
        etapas.push("alteração de senha e novo login");

        const resumo = await esperarStatus("/admin/resumo", 200, { token: tokenAdmin });
        conferir(Number.isFinite(resumo.dados?.usuarios), "Resumo administrativo inválido");

        console.log(`Smoke test concluído: ${etapas.length} etapas aprovadas.`);
        etapas.forEach((etapa) => console.log(`- ${etapa}`));
    } finally {
        await limparDados();
        await db.end();
    }
}

function montarPonto(nome, tipoId, materialId) {
    return {
        nome,
        descricao: "Registro temporário de teste",
        tipo_ponto_id: tipoId,
        cep: "85501-000",
        rua: "Rua de Teste",
        numero: "100",
        bairro: "Centro",
        cidade: "Pato Branco",
        estado: "PR",
        latitude: -26.2294,
        longitude: -52.6706,
        telefone: "46999999999",
        horario_funcionamento: "Segunda a sexta, das 8h às 18h",
        materiais: [materialId]
    };
}

executar().catch((erro) => {
    console.error(`Smoke test falhou: ${erro.message}`);
    process.exitCode = 1;
});
