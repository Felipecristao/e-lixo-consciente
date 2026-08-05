const express = require("express");

const router = express.Router();

const usuariosController = require("../controllers/usuariosController");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");

router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/", usuariosController.listar);
router.get("/:id", usuariosController.buscarPorId);
router.put("/:id", usuariosController.atualizar);
router.delete("/:id", usuariosController.excluir);

module.exports = router;