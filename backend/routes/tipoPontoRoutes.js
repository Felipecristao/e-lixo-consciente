const express = require("express");

const router = express.Router();

const tipoPontoController = require("../controllers/tipoPontoController");

router.get("/", tipoPontoController.listar);

module.exports = router;