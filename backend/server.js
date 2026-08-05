const db = require("./config/database");
require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

if (process.env.NODE_ENV === "production") {
    // Na VPS, o Caddy é o único proxy entre o visitante e a aplicação.
    app.set("trust proxy", 1);
}

function validarConfiguracao() {
    const obrigatorias = [
        "DB_HOST",
        "DB_PORT",
        "DB_USER",
        "DB_PASSWORD",
        "DB_NAME",
        "JWT_SECRET"
    ];
    const ausentes = obrigatorias.filter(
        (chave) => !String(process.env[chave] || "").trim()
    );

    if (ausentes.length) {
        throw new Error(
            `Variaveis de ambiente ausentes: ${ausentes.join(", ")}`
        );
    }

    if (
        process.env.NODE_ENV === "production" &&
        process.env.JWT_SECRET.length < 32
    ) {
        throw new Error(
            "JWT_SECRET deve ter pelo menos 32 caracteres em producao."
        );
    }
}

const origensPermitidas = (
    process.env.CORS_ORIGIN ||
    "http://127.0.0.1:5500,http://localhost:5500"
)
    .split(",")
    .map((origem) => origem.trim())
    .filter(Boolean);

app.disable("x-powered-by");

app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
        "Permissions-Policy",
        "camera=(), microphone=(), payment=()"
    );

    next();
});

app.use((req, res, next) => {
    const origem = req.headers.origin;

    if (!origem) {
        return next();
    }

    const mesmaOrigem = (() => {
        try {
            return new URL(origem).host === req.headers.host;
        } catch (erro) {
            return false;
        }
    })();

    if (!mesmaOrigem && !origensPermitidas.includes(origem)) {
        return res.status(403).json({
            erro: "Origem nao permitida."
        });
    }

    res.setHeader("Access-Control-Allow-Origin", origem);
    res.setHeader("Vary", "Origin");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization"
    );

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    return next();
});

app.use(express.json({ limit: "100kb" }));

app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    next();
});

const pastaFrontend = path.join(__dirname, "../frontend");
const paginasPublicas = {
    "/": "index.html",
    "/login": "login.html",
    "/cadastro": "cadastro.html",
    "/mapa": "mapa.html",
    "/como-funciona": "como-funciona.html",
    "/sobre": "sobre.html",
    "/meus-pontos": "dashboard.html",
    "/perfil": "perfil.html",
    "/painel-admin": "admin-dashboard.html",
    "/cadastrar-ponto": "cadastro-ponto.html",
    "/esqueci-senha": "esqueci-senha.html",
    "/redefinir-senha": "redefinir-senha.html",
    "/politica-de-privacidade": "politica-privacidade.html",
    "/termos-de-uso": "termos-uso.html"
};
const rotasAntigas = Object.fromEntries(
    Object.entries(paginasPublicas).map(([rota, arquivo]) => [
        `/${arquivo}`,
        rota
    ])
);

app.use((req, res, next) => {
    if (req.method !== "GET" || !rotasAntigas[req.path]) {
        return next();
    }

    const inicioConsulta = req.originalUrl.indexOf("?");
    const consulta = inicioConsulta >= 0
        ? req.originalUrl.slice(inicioConsulta)
        : "";

    return res.redirect(301, rotasAntigas[req.path] + consulta);
});

Object.entries(paginasPublicas).forEach(([rota, arquivo]) => {
    app.get(rota, (req, res) => {
        res.sendFile(path.join(pastaFrontend, arquivo));
    });
});

app.use(express.static(pastaFrontend));

/* Rotas */

const authRoutes = require("./routes/auth");
const pontosRoutes = require("./routes/pontos");
const usuariosRoutes = require("./routes/usuarios");
const tipoPontoRoutes = require("./routes/tipoPontoRoutes");
const materialRoutes = require("./routes/materialRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/pontos", pontosRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/tipos-ponto", tipoPontoRoutes);
app.use("/api/materiais", materialRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", async (req, res) => {
    try {
        await db.execute("SELECT 1");

        return res.json({
            status: "ok",
            banco: "conectado"
        });
    } catch (erro) {
        return res.status(503).json({
            status: "indisponivel",
            banco: "desconectado"
        });
    }
});
/* Home */

app.get("/api", (req, res) => {
    res.json({
        projeto: "E-Lixo Consciente",
        versao: "1.3.0",
        status: "Servidor Online",

        endpoints: {
            auth: "/api/auth",
            usuarios: "/api/usuarios",
            pontos: "/api/pontos",
            tiposPonto: "/api/tipos-ponto"
        }
    });
});

/* Rota não encontrada */

app.use((req, res) => {
    return res.status(404).json({
        erro: "Rota não encontrada."
    });
});

/* Tratamento de erros */

app.use((erro, req, res, next) => {
    console.error("Erro não tratado:", erro);

    return res.status(500).json({
        erro: "Erro interno do servidor."
    });
});

/* Banco */

async function conectarBanco() {
    const conexao = await db.getConnection();

    try {
        console.log("==================================");
        console.log("MariaDB conectado com sucesso!");
        console.log("Banco:", process.env.DB_NAME);
        console.log("==================================");

    } finally {
        conexao.release();
    }
}

async function conectarBancoComTentativas(maxTentativas = 5) {
    let ultimoErro;

    for (let tentativa = 1; tentativa <= maxTentativas; tentativa += 1) {
        try {
            await conectarBanco();
            return;
        } catch (erro) {
            ultimoErro = erro;
            console.error(
                `Banco indisponivel (tentativa ${tentativa}/${maxTentativas}).`
            );

            if (tentativa < maxTentativas) {
                await new Promise((resolver) => {
                    setTimeout(resolver, 3000);
                });
            }
        }
    }

    throw ultimoErro;
}

/* Servidor */

async function iniciarServidor() {
    try {
        validarConfiguracao();
        await conectarBancoComTentativas();

        const PORT = process.env.PORT || 3001;

        return app.listen(PORT, () => {
            console.log("");
            console.log("==================================");
            console.log(" E-LIXO CONSCIENTE");
            console.log(" Servidor iniciado");
            console.log(" Porta:", PORT);
            console.log("==================================");
        });
    } catch (erro) {
        console.error("Falha ao iniciar o servidor:");
        console.error(erro.message);
        process.exitCode = 1;
        return null;
    }
}

if (require.main === module) {
    iniciarServidor();
}

module.exports = {
    app,
    iniciarServidor,
    validarConfiguracao
};


