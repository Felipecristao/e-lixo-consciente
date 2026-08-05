const MaterialModel = require("../models/materialModel");

class MaterialController {

    async listar(req, res) {

        try {

            const materiais = await MaterialModel.listar();

            return res.json(materiais);

        } catch (erro) {

            console.error(erro);

            return res.status(500).json({
                erro: "Erro ao listar materiais."
            });

        }

    }

}

module.exports = new MaterialController();