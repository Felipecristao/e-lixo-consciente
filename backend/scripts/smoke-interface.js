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
        "DELETE FROM usuarios WHERE email IN (?, ?) OR email LIKE ?",
        [emailUsuario, emailAdmin, `ui.extra.${id}.%@example.invalid`]
    );
}

async function criarAdmin() {
    const hash = await bcrypt.hash(senhaAdmin, 10);
    await db.execute(
        "INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, 'ADMIN')",
        ["Administrador da interface", emailAdmin, hash]
    );

    for (let indice = 1; indice <= 8; indice += 1) {
        await db.execute(
            "INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, 'USUARIO')",
            [`Pessoa adicional ${indice}`, `ui.extra.${id}.${indice}@example.invalid`, hash]
        );
    }
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

        const respostaLegada = await pagina.goto(`${site}/login.html`, { waitUntil: "domcontentloaded" });
        conferir(respostaLegada?.url().endsWith("/login"), "URL antiga de login não foi redirecionada");

        await pagina.goto(`${site}/cadastro`, { waitUntil: "domcontentloaded" });
        await pagina.fill("#nome", "Usuário da interface");
        await pagina.fill("#email", emailUsuario);
        await pagina.fill("#senha", senhaUsuario);
        await pagina.fill("#confirmarSenha", senhaUsuario);
        await pagina.check("#aceiteTermos");
        await pagina.click("#btnCadastrar");
        await pagina.waitForURL((url) => url.pathname === "/", { timeout: 15000 })
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

        await pagina.goto(`${site}/como-funciona`, { waitUntil: "domcontentloaded" });
        await pagina.waitForSelector(".profile-menu__trigger");
        conferir(await pagina.getByText("Meus pontos de coleta", { exact: true }).count(), "Sessão não foi mantida em Como Funciona");

        await pagina.goto(`${site}/mapa`, { waitUntil: "domcontentloaded" });
        await pagina.waitForSelector("#map");
        conferir(await pagina.locator("#mapPointsList").count(), "Lista do mapa não foi carregada");

        await pagina.evaluate(() => selecionarLocalizacaoMapa({
            titulo: "Local de teste",
            detalhes: "Centro - Pato Branco - PR",
            cidade: "Pato Branco",
            latitude: -26.2295,
            longitude: -52.6716
        }, 16, true));
        await pagina.waitForTimeout(600);

        const marcadorLocalizacao = await pagina.locator(".map-user-location").boundingBox();
        conferir(
            marcadorLocalizacao && marcadorLocalizacao.width <= 24 && marcadorLocalizacao.height <= 24,
            "Marcador da localização foi exibido fora do tamanho esperado"
        );

        const mapaCentralizado = await pagina.locator("#map").evaluate((elemento) => {
            const limites = elemento.getBoundingClientRect();
            const centroMapa = limites.top + limites.height / 2;
            return Math.abs(centroMapa - window.innerHeight / 2) < 120;
        });
        conferir(mapaCentralizado, "Mapa não foi centralizado na tela");

        await pagina.goto(`${site}/meus-pontos`, { waitUntil: "domcontentloaded" });
        await pagina.waitForSelector("#meusPontosContainer");
        conferir(await pagina.getByText("Meus pontos sugeridos", { exact: true }).count(), "Painel do usuário não abriu");

        await pagina.evaluate(() => localStorage.clear());
        await pagina.goto(`${site}/login`, { waitUntil: "domcontentloaded" });
        await pagina.fill("#email", emailUsuario);
        await pagina.fill("#senha", senhaUsuario);
        await pagina.click("#loginForm button[type='submit']");
        await pagina.waitForURL((url) => url.pathname === "/", { timeout: 15000 })
            .catch(() => {
                throw new Error(`Login do usuário não abriu a página inicial; destino atual: ${pagina.url()}`);
            });

        await pagina.evaluate(() => localStorage.clear());
        await pagina.goto(`${site}/login`, { waitUntil: "domcontentloaded" });
        await pagina.fill("#email", emailAdmin);
        await pagina.fill("#senha", senhaAdmin);
        await pagina.route("**/api/admin/resumo", (rota) => rota.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ pendentes: 3, aprovados: 0, rejeitados: 0, usuarios: 2 })
        }));
        await pagina.click("#loginForm button[type='submit']");
        await pagina.waitForURL((url) => url.pathname === "/", { timeout: 15000 })
            .catch(() => {
                throw new Error(`Login administrativo não abriu a página inicial; destino atual: ${pagina.url()}`);
            });
        const atalhoAdmin = pagina.locator(".admin-profile-btn").filter({ hasText: "Painel administrador" }).first();
        conferir(await atalhoAdmin.count(), "Atalho administrativo não apareceu");
        await atalhoAdmin.locator(".admin-notification-badge").waitFor();
        conferir(
            await atalhoAdmin.locator(".admin-notification-badge").textContent() === "3",
            "Contador de pendências administrativas não apareceu"
        );
        await pagina.unroute("**/api/admin/resumo");

        const pontosPaginacao = Array.from({ length: 9 }, (_, indice) => ({
            id: 9000 + indice,
            nome: `PONTO DE PAGINAÇÃO ${indice + 1}`,
            cidade: "Pato Branco",
            tipo: "Cooperativa",
            usuario: "Teste",
            data_cadastro: new Date().toISOString(),
            status: "APROVADO",
            exclusao_status: ""
        }));
        await pagina.route("**/api/admin/pontos", (rota) => rota.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(pontosPaginacao)
        }));

        await pagina.goto(`${site}/painel-admin`, { waitUntil: "domcontentloaded" });
        await pagina.waitForSelector("#adminPontosTabela");
        await pagina.waitForSelector("#adminUsuariosTabela");
        conferir(await pagina.getByText("Painel Administrativo", { exact: true }).count(), "Painel administrativo não abriu");
        conferir(await pagina.locator("#adminPontosTabela tr").count() === 7, "Tabela de pontos não respeitou o limite por página");
        conferir(await pagina.locator("#paginacaoPontos:not([hidden])").count(), "Paginação dos pontos não apareceu");
        conferir(await pagina.locator("#adminUsuariosTabela tr").count() === 7, "Tabela de usuários não respeitou o limite por página");
        conferir(await pagina.locator("#paginacaoUsuarios:not([hidden])").count(), "Paginação dos usuários não apareceu");
        await pagina.unroute("**/api/admin/pontos");

        await pagina.fill("#filtroUsuarios", emailUsuario);
        conferir(await pagina.getByText(emailUsuario, { exact: true }).count(), "Pesquisa não encontrou o usuário");

        const linhaUsuario = pagina
            .locator("#adminUsuariosTabela tr")
            .filter({ hasText: emailUsuario });

        pagina.once("dialog", (dialogo) => dialogo.accept());
        await linhaUsuario.getByRole("button", { name: "Tornar administrador" }).click();
        await linhaUsuario.getByRole("button", { name: "Tornar colaborador" }).waitFor();

        pagina.once("dialog", (dialogo) => dialogo.accept());
        await linhaUsuario.getByRole("button", { name: "Tornar colaborador" }).click();
        await linhaUsuario.getByRole("button", { name: "Tornar administrador" }).waitFor();

        pagina.once("dialog", (dialogo) => dialogo.accept());
        await linhaUsuario.getByRole("button", { name: "Inativar usuário" }).click();
        await linhaUsuario.getByRole("button", { name: "Reativar usuário" }).waitFor();

        pagina.once("dialog", (dialogo) => dialogo.accept());
        await linhaUsuario.getByRole("button", { name: "Reativar usuário" }).click();
        await linhaUsuario.getByRole("button", { name: "Inativar usuário" }).waitFor();

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
