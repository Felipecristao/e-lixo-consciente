const express = require("express");

const router = express.Router();

const usuariosController = require("../controllers/usuariosController");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");

router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/", usuariosController.listar);
router.get("/:id", usuariosController.buscarPorId);
router.patch("/:id/perfil", usuariosController.alterarPerfil);
router.patch("/:id/status", usuariosController.alterarStatus);

module.exports = router;
