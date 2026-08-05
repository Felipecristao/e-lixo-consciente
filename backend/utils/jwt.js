const jwt = require("jsonwebtoken");

module.exports = (payload) => {
    if (
        process.env.NODE_ENV === "production" &&
        (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    ) {
        throw new Error(
            "JWT_SECRET deve ter pelo menos 32 caracteres em producao."
        );
    }

    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        {
            algorithm: "HS256",
            expiresIn: process.env.JWT_EXPIRES_IN || "7d"
        }
    );
};
