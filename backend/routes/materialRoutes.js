const express = require("express");

const router = express.Router();

const materialController = require("../controllers/materialController");

router.get("/", materialController.listar);

module.exports = router;