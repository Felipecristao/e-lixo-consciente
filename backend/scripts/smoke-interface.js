require("dotenv").config();

const crypto = require("node:crypto");
const fs = require("node:fs");
const bcrypt = require("bcryptjs");
const { chromium } = require("playwright");
const db = require("../config/database");

const site = process.env.SMOKE_SITE_URL || "http://127.0.0.1:3001";
const id = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
const emailUsuario = `ui.usuario.${id}@example.invalid`;
const emailAdmin = `ui.admin.${id}@example.invalid`;
const senhaUsuario = crypto.randomBytes(18).toString("base64url");
const senhaAdmin = crypto.randomBytes(18).toString("base64url");

const navegadores = [
    process.env.SMOKE_BROWSER_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
].filter(Boolean);

function conferir(condicao, mensagem) {
    if (!condicao) throw new Error(mensagem);
}

async function limparDados() {
    await db.execute(
        "DELETE FROM usuarios WHERE email IN (?, ?)",
        [emailUsuario, emailAdmin]
    );
}

async function criarAdmin() {
    const hash = await bcrypt.hash(senhaAdmin, 10);
    await db.execute(
        "INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, 'ADMIN')",
        ["Administrador da interface", emailAdmin, hash]
    );
}

async function executar() {
    const executavel = navegadores.find((caminho) => fs.existsSync(caminho));
    conferir(executavel, "Nenhum navegador compatível foi encontrado");

    let browser;

    try {
        await limparDados();
        await criarAdmin();

        browser = await chromium.launch({
            executablePath: executavel,
            headless: true
        });
        const pagina = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        const errosPagina = [];
        pagina.on("pageerror", (erro) => errosPagina.push(erro.message));

        await pagina.goto(`${site}/cadastro.html`, { waitUntil: "domcontentloaded" });
        await pagina.fill("#nome", "Usuário da interface");
        await pagina.fill("#email", emailUsuario);
        await pagina.fill("#senha", senhaUsuario);
        await pagina.fill("#confirmarSenha", senhaUsuario);
        await pagina.check("#aceiteTermos");
        await pagina.click("#btnCadastrar");
        await pagina.waitForURL(/index\.html$/, { timeout: 15000 })
            .catch(async () => {
                const mensagem = await pagina.locator("#cadastroMensagem").textContent();
                throw new Error(`Cadastro não abriu a página inicial; destino atual: ${pagina.url()}; mensagem: ${mensagem?.trim() || "vazia"}`);
            });

        const sessaoUsuario = await pagina.evaluate(() => ({
            token: Boolean(localStorage.getItem("token")),
            usuario: Boolean(localStorage.getItem("usuario"))
        }));
        conferir(sessaoUsuario.token && sessaoUsuario.usuario, "Cadastro não criou a sessão no navegador");
        await pagina.waitForSelector(".profile-menu__trigger");
        conferir(await pagina.getByText("Meus pontos de coleta", { exact: true }).count(), "Atalho do usuário não apareceu na home");

        await pagina.goto(`${site}/como-funciona.html`, { waitUntil: "domcontentloaded" });
        await pagina.waitForSelector(".profile-menu__trigger");
        conferir(await pagina.getByText("Meus pontos de coleta", { exact: true }).count(), "Sessão não foi mantida em Como Funciona");

        await pagina.goto(`${site}/mapa.html`, { waitUntil: "domcontentloaded" });
        await pagina.waitForSelector("#map");
        conferir(await pagina.locator("#mapPointsList").count(), "Lista do mapa não foi carregada");

        await pagina.goto(`${site}/dashboard.html`, { waitUntil: "domcontentloaded" });
        await pagina.waitForSelector("#meusPontosContainer");
        conferir(await pagina.getByText("Meus pontos sugeridos", { exact: true }).count(), "Painel do usuário não abriu");

        await pagina.evaluate(() => localStorage.clear());
        await pagina.goto(`${site}/login.html`, { waitUntil: "domcontentloaded" });
        await pagina.fill("#email", emailUsuario);
        await pagina.fill("#senha", senhaUsuario);
        await pagina.click("#loginForm button[type='submit']");
        await pagina.waitForURL(/index\.html$/, { timeout: 15000 })
            .catch(() => {
                throw new Error(`Login do usuário não abriu a página inicial; destino atual: ${pagina.url()}`);
            });

        await pagina.evaluate(() => localStorage.clear());
        await pagina.goto(`${site}/login.html`, { waitUntil: "domcontentloaded" });
        await pagina.fill("#email", emailAdmin);
        await pagina.fill("#senha", senhaAdmin);
        await pagina.click("#loginForm button[type='submit']");
        await pagina.waitForURL(/index\.html$/, { timeout: 15000 })
            .catch(() => {
                throw new Error(`Login administrativo não abriu a página inicial; destino atual: ${pagina.url()}`);
            });
        conferir(await pagina.getByText("Painel administrador", { exact: true }).count(), "Atalho administrativo não apareceu");

        await pagina.goto(`${site}/admin-dashboard.html`, { waitUntil: "domcontentloaded" });
        await pagina.waitForSelector("#adminPontosTabela");
        await pagina.waitForSelector("#adminUsuariosTabela");
        conferir(await pagina.getByText("Painel Administrativo", { exact: true }).count(), "Painel administrativo não abriu");
        conferir(await pagina.getByText(emailUsuario, { exact: true }).count(), "Usuário não apareceu na gestão administrativa");

        const linhaUsuario = pagina
            .locator("#adminUsuariosTabela tr")
            .filter({ hasText: emailUsuario });

        pagina.once("dialog", (dialogo) => dialogo.accept());
        await linhaUsuario.getByRole("button", { name: "Tornar administrador" }).click();
        await linhaUsuario.getByRole("button", { name: "Remover acesso" }).waitFor();

        pagina.once("dialog", (dialogo) => dialogo.accept());
        await linhaUsuario.getByRole("button", { name: "Remover acesso" }).click();
        await linhaUsuario.getByRole("button", { name: "Tornar administrador" }).waitFor();

        conferir(errosPagina.length === 0, `Erros JavaScript no navegador: ${errosPagina.join(" | ")}`);
        console.log("Teste de interface concluído: cadastro, login, navegação e painel administrativo aprovados.");
    } finally {
        await browser?.close();
        await limparDados();
        await db.end();
    }
}

executar().catch((erro) => {
    console.error(`Teste de interface falhou: ${erro.message}`);
    process.exitCode = 1;
});
