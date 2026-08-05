document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");

    if (!token) {
        return;
    }

    let usuario = null;

    try {
        usuario = JSON.parse(
            localStorage.getItem("usuario") || "null"
        );
    } catch (erro) {
        usuario = null;
    }

    const ehAdmin = usuario?.perfil === "ADMIN";
    const acoes = document.querySelector(".header__actions");

    if (!acoes) {
        return;
    }

    acoes.innerHTML = `
        <a
            href="${ehAdmin ? "admin-dashboard.html" : "dashboard.html"}"
            class="btn ${ehAdmin ? "admin-profile-btn" : "header-login-btn"}"
        >
            ${ehAdmin ? "Painel administrador" : "Meus pontos de coleta"}
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
    `;
});
