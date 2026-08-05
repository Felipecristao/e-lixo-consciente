const express = require("express");

const router = express.Router();

const pontosController = require("../controllers/pontosController");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");

// Públicas
router.get("/", pontosController.listar);

// Usuário autenticado
router.get("/meus", authMiddleware, pontosController.listarMeus);
router.post("/", authMiddleware, pontosController.criar);

router.post(
    "/:id/solicitar-exclusao",
    authMiddleware,
    pontosController.solicitarExclusao
);

// Administrador
router.get(
    "/pendentes",
    authMiddleware,
    adminMiddleware,
    pontosController.listarPendentes
);

router.patch(
    "/:id/status",
    authMiddleware,
    adminMiddleware,
    pontosController.atualizarStatus
);

router.put(
    "/:id",
    authMiddleware,
    adminMiddleware,
    pontosController.atualizar
);

router.delete(
    "/:id",
    authMiddleware,
    adminMiddleware,
    pontosController.excluir
);

// Por ID deve ficar por último
router.get("/:id", pontosController.buscarPorId);

module.exports = router;
