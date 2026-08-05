const express = require("express");

const router = express.Router();

const adminController = require("../controllers/adminController");
const autenticar = require("../middleware/auth");
const somenteAdmin = require("../middleware/admin");

router.use(autenticar);
router.use(somenteAdmin);

router.get(
    "/resumo",
    adminController.resumo
);

router.get(
    "/pontos",
    adminController.listarPontos
);

router.get(
    "/pontos/:id",
    adminController.buscarPontoPorId
);

router.put(
    "/pontos/:id/aprovar",
    adminController.aprovarPonto
);

router.put(
    "/pontos/:id/rejeitar",
    adminController.rejeitarPonto
);

router.put(
    "/pontos/:id/exclusao/aprovar",
    adminController.aprovarExclusaoPonto
);

router.put(
    "/pontos/:id/exclusao/rejeitar",
    adminController.rejeitarExclusaoPonto
);

module.exports = router;
