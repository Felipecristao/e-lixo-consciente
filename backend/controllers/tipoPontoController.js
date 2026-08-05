const TipoPontoModel = require("../models/tipoPontoModel");

class TipoPontoController {

    async listar(req, res) {

        try {

            const tipos = await TipoPontoModel.listar();

            return res.json(tipos);

        } catch (erro) {

            console.error(erro);

            return res.status(500).json({
                erro: "Erro ao listar tipos de ponto."
            });

        }

    }

}

module.exports = new TipoPontoController();