const nodemailer = require("nodemailer");

let transportador = null;

function emailConfigurado() {
    return Boolean(
        process.env.EMAIL_HOST &&
        process.env.EMAIL_USER &&
        process.env.EMAIL_PASS
    );
}

function obterTransportador() {
    if (transportador) {
        return transportador;
    }

    const porta = Number(process.env.EMAIL_PORT || 587);

    transportador = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: porta,
        secure: porta === 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    return transportador;
}

async function enviarEmailRecuperacaoSenha({ para, nome, link }) {
    if (!emailConfigurado()) {
        const erro = new Error(
            "Envio de e-mail nao configurado (EMAIL_HOST/EMAIL_USER/EMAIL_PASS ausentes)."
        );
        erro.codigo = "EMAIL_NAO_CONFIGURADO";
        throw erro;
    }

    const remetente =
        process.env.EMAIL_FROM || process.env.EMAIL_USER;

    const primeiroNome = String(nome || "").trim().split(" ")[0] || "";

    await obterTransportador().sendMail({
        from: `"E-Lixo Consciente" <${remetente}>`,
        to: para,
        subject: "Recuperação de senha - E-Lixo Consciente",
        text:
            `Olá${primeiroNome ? ", " + primeiroNome : ""}!\n\n` +
            "Recebemos uma solicitação para redefinir a senha da sua conta " +
            "no E-Lixo Consciente.\n\n" +
            `Para criar uma nova senha, acesse o link abaixo:\n${link}\n\n` +
            "Este link expira em 1 hora e só pode ser usado uma vez.\n\n" +
            "Se você não solicitou essa alteração, pode ignorar este e-mail " +
            "- sua senha atual continua valendo normalmente.",
        html: `
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#1f2933;">
                <h2 style="color:#1b7a3d;">E-Lixo Consciente</h2>
                <p>Olá${primeiroNome ? ", " + escaparHtml(primeiroNome) : ""}!</p>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
                <p style="text-align:center;margin:28px 0;">
                    <a href="${link}"
                       style="background:#1b7a3d;color:#ffffff;text-decoration:none;
                              padding:12px 24px;border-radius:6px;display:inline-block;">
                        Redefinir minha senha
                    </a>
                </p>
                <p>Ou copie e cole este link no navegador:<br>
                    <a href="${link}">${link}</a>
                </p>
                <p style="color:#616e7c;font-size:13px;">
                    Este link expira em 1 hora e só pode ser usado uma vez.
                    Se você não solicitou essa alteração, ignore este e-mail
                    - sua senha atual continua valendo normalmente.
                </p>
            </div>
        `
    });
}

function escaparHtml(texto) {
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

module.exports = {
    emailConfigurado,
    enviarEmailRecuperacaoSenha
};
