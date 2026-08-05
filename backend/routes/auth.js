const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");
const { criarRateLimit } = require("../middleware/rateLimit");

const limiteAuth = criarRateLimit({
    janelaMs: 15 * 60 * 1000,
    max: 20
});

const limiteSenha = criarRateLimit({
    janelaMs: 60 * 60 * 1000,
    max: 5,
    mensagem:
        "Muitas tentativas de recuperacao. Aguarde e tente novamente."
});

router.post("/register", limiteAuth, authController.register);

router.post("/login", limiteAuth, authController.login);

router.get("/me", authMiddleware, authController.me);

router.put("/me", authMiddleware, authController.atualizarMe);

router.put("/me/senha", authMiddleware, authController.alterarSenha);

router.post("/esqueci-senha", limiteSenha, authController.esqueciSenha);

router.post("/redefinir-senha", limiteSenha, authController.redefinirSenha);

module.exports = router;
