const jwt = require("jsonwebtoken");
const db = require("../config/database");

module.exports = async (req, res, next) => {
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

        const [usuarios] = await db.execute(
            "SELECT id, email, perfil, ativo FROM usuarios WHERE id = ? LIMIT 1",
            [decoded.id]
        );

        if (!usuarios.length || !Number(usuarios[0].ativo)) {
            return res.status(401).json({
                erro: "Conta inativa ou inexistente."
            });
        }

        req.usuario = {
            id: usuarios[0].id,
            email: usuarios[0].email,
            perfil: usuarios[0].perfil
        };

        return next();
    } catch (erro) {
        return res.status(401).json({
            erro: "Token invalido ou expirado."
        });
    }
};
