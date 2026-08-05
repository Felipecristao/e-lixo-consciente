function criarRateLimit({
    janelaMs = 15 * 60 * 1000,
    max = 20,
    mensagem = "Muitas tentativas. Aguarde um pouco e tente novamente."
} = {}) {
    const acessos = new Map();

    const limparExpirados = setInterval(() => {
        const agora = Date.now();

        for (const [chave, registro] of acessos.entries()) {
            if (registro.resetEm <= agora) {
                acessos.delete(chave);
            }
        }
    }, janelaMs);

    if (limparExpirados.unref) {
        limparExpirados.unref();
    }

    return (req, res, next) => {
        const agora = Date.now();
        const ip =
            req.ip ||
            req.headers["x-forwarded-for"] ||
            req.socket.remoteAddress ||
            "desconhecido";
        const rota = req.originalUrl.split("?")[0];
        const chave = `${ip}:${rota}`;
        const registro = acessos.get(chave);

        if (!registro || registro.resetEm <= agora) {
            acessos.set(chave, {
                quantidade: 1,
                resetEm: agora + janelaMs
            });

            return next();
        }

        registro.quantidade += 1;

        if (registro.quantidade > max) {
            const segundosRestantes = Math.ceil(
                (registro.resetEm - agora) / 1000
            );

            res.setHeader("Retry-After", String(segundosRestantes));

            return res.status(429).json({
                erro: mensagem
            });
        }

        return next();
    };
}

module.exports = {
    criarRateLimit
};
