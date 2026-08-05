document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.classList.add("js-profile-menu-ready");

    setTimeout(() => {
        document.querySelectorAll(
            ".header__actions, .dashboard-header__actions"
        ).forEach(configurarMenuPerfil);
    }, 0);
});

function configurarMenuPerfil(acoes) {
    if (!localStorage.getItem("token")) return;

    const menuExistente = acoes.querySelector(":scope > .profile-menu");
    if (menuExistente) {
        vincularMenuPerfil(menuExistente);
        return;
    }

    const linkExistente =
        acoes.querySelector(".header-profile-avatar") ||
        acoes.querySelector(':scope > a[href="perfil.html"]');
    const botaoSair = acoes.querySelector(
        ':scope > button[id^="btnSair"]'
    );

    const menu = document.createElement("div");
    menu.className = "profile-menu";
    menu.innerHTML = `
        <button
            type="button"
            class="header-profile-avatar profile-menu__trigger"
            aria-label="Abrir menu do perfil"
            aria-haspopup="true"
            aria-expanded="false"
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 21a8 8 0 0 1 16 0"/>
            </svg>
        </button>

        <div class="profile-menu__dropdown" role="menu">
            <a href="perfil.html" role="menuitem">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M4 21a8 8 0 0 1 16 0"/>
                </svg>
                Meu perfil
            </a>

            <button type="button" class="profile-menu__logout" role="menuitem">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M10 17l5-5-5-5M15 12H3"/>
                    <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>
                </svg>
                Sair
            </button>
        </div>
    `;

    if (linkExistente) {
        linkExistente.replaceWith(menu);
    } else if (botaoSair) {
        acoes.insertBefore(menu, botaoSair);
    } else {
        acoes.appendChild(menu);
    }

    botaoSair?.remove();

    vincularMenuPerfil(menu);
}

function vincularMenuPerfil(menu) {
    const gatilho = menu.querySelector(".profile-menu__trigger");
    if (!gatilho || menu.dataset.configurado === "true") return;
    menu.dataset.configurado = "true";

    gatilho.addEventListener("click", (evento) => {
        evento.stopPropagation();
        const aberto = menu.classList.toggle("is-open");
        gatilho.setAttribute("aria-expanded", String(aberto));
    });

    menu.querySelector(".profile-menu__logout").addEventListener(
        "click",
        () => {
            localStorage.removeItem("token");
            localStorage.removeItem("usuario");
            window.location.href = "index.html";
        }
    );

    document.addEventListener("click", (evento) => {
        if (!menu.contains(evento.target)) fecharMenuPerfil(menu);
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") fecharMenuPerfil(menu);
    });
}

function fecharMenuPerfil(menu) {
    menu.classList.remove("is-open");
    menu.querySelector(".profile-menu__trigger")
        ?.setAttribute("aria-expanded", "false");
}
