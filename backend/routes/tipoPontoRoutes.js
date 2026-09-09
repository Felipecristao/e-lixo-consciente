const express = require("express");

const tipoPontoController = require("../controllers/tipoPontoController");

router.get("/", tipoPontoController.listar);

module.exports = router;