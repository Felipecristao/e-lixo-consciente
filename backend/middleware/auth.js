const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ erro: "Token nao informado." });
    }

    const partes = authHeader.split(" ");

    if (
        partes.length !== 2 ||
        partes[0] !== "Bearer" ||
        !partes[1]
    ) {
        return res.status(401).json({
            erro: "Formato de token invalido."
        });
    }

    try {
        const decoded = jwt.verify(
            partes[1],
            process.env.JWT_SECRET,
            {
                algorithms: ["HS256"]
            }
        );

        req.usuario = decoded;

        return next();
    } catch (erro) {
        return res.status(401).json({
            erro: "Token invalido ou expirado."
        });
    }
};
