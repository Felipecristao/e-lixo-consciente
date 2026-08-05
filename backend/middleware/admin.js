module.exports = (req, res, next) => {
    if (!req.usuario) {
        return res.status(401).json({
            erro: "Usuario nao autenticado."
        });
    }

    if (req.usuario.perfil !== "ADMIN") {
        return res.status(403).json({
            erro: "Acesso permitido apenas para administradores."
        });
    }

    return next();
};
