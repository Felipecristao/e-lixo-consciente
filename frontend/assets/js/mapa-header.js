document.addEventListener("DOMContentLoaded", () => {
    configurarHeaderUsuario();
    configurarMenuMobile();
    configurarBotoesCadastro();
});

function configurarHeaderUsuario() {
    const token = localStorage.getItem("token");

    if (!token) {
        return;
    }

    const usuario = obterUsuarioLocal();
    const ehAdmin = usuario?.perfil === "ADMIN";
    const linkPainel = ehAdmin
        ? "admin-dashboard.html"
        : "dashboard.html";
    const textoPainel = ehAdmin
        ? "Painel administrador"
        : "Meus pontos de coleta";
    const classePainel = ehAdmin
        ? "admin-profile-btn"
        : "header-login-btn";

    const headerActions =
        document.querySelector(".header__actions");
    const menuMobile =
        document.getElementById("mobile-menu");

    if (headerActions) {
        headerActions.innerHTML = `
            <a
                href="${linkPainel}"
                class="btn ${classePainel}"
            >
                ${textoPainel}
            </a>

            <div class="profile-menu">
                <button type="button" class="header-profile-avatar profile-menu__trigger" aria-label="Abrir menu do perfil" aria-haspopup="true" aria-expanded="false">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <circle cx="12" cy="8" r="4"/>
                        <path d="M4 21a8 8 0 0 1 16 0"/>
                    </svg>
                </button>
                <div class="profile-menu__dropdown" role="menu">
                    <a href="perfil.html" role="menuitem">Meu perfil</a>
                    <button type="button" class="profile-menu__logout" role="menuitem">Sair</button>
                </div>
            </div>

            <button
                type="button"
                class="mobile-menu-btn"
                id="menu-toggle"
                aria-label="Abrir menu"
                aria-expanded="false"
            >
                <svg
                    id="menu-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
            </button>
        `;
    }

    if (menuMobile) {
        menuMobile.innerHTML = `
            <a href="mapa.html">Pontos de Coleta</a>
            <a href="como-funciona.html">Como Funciona</a>
            <a href="sobre.html">Sobre</a>
            ${ehAdmin
                ? '<a href="admin-dashboard.html" class="btn admin-profile-btn">Painel administrador</a>'
                : '<a href="dashboard.html" class="btn header-mobile-login">Meus pontos de coleta</a><a href="perfil.html">Meu perfil</a>'}
            <button
                type="button"
                class="btn header-mobile-login"
                id="btnSairMapaMobile"
                style="justify-content:center;border-radius:1rem;padding:.75rem"
            >
                Sair
            </button>
        `;
    }

    configurarSaida();
}

function obterUsuarioLocal() {
    try {
        return JSON.parse(
            localStorage.getItem("usuario") || "null"
        );
    } catch (erro) {
        return null;
    }
}

function configurarSaida() {
    ["btnSairMapa", "btnSairMapaMobile"].forEach((id) => {
        const botao = document.getElementById(id);

        if (!botao) {
            return;
        }

        botao.addEventListener("click", () => {
            localStorage.removeItem("token");
            localStorage.removeItem("usuario");
            window.location.href = "index.html";
        });
    });
}

function configurarMenuMobile() {
    const botaoMenu =
        document.getElementById("menu-toggle");

    const menuMobile =
        document.getElementById("mobile-menu");

    if (!botaoMenu || !menuMobile) {
        return;
    }

    botaoMenu.addEventListener("click", () => {
        const estaAberto =
            menuMobile.classList.toggle("is-open");

        botaoMenu.setAttribute(
            "aria-expanded",
            String(estaAberto)
        );
    });

    const links =
        menuMobile.querySelectorAll("a");

    links.forEach((link) => {
        link.addEventListener("click", () => {
            menuMobile.classList.remove("is-open");

            botaoMenu.setAttribute(
                "aria-expanded",
                "false"
            );
        });
    });
}

function configurarBotoesCadastro() {
    const ids = [
        "btnCadastrarPonto",
        "btnCadastrarPontoMobile"
    ];

    ids.forEach((id) => {
        const botao =
            document.getElementById(id);

        if (!botao) {
            return;
        }

        botao.addEventListener(
            "click",
            redirecionarCadastro
        );
    });
}

function redirecionarCadastro() {
    const token =
        localStorage.getItem("token");

    window.location.href =
        token
            ? "cadastro-ponto.html"
            : "login.html";
}
