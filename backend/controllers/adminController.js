const AdminModel = require("../models/adminModel");

class AdminController {

    async resumo(req, res) {
        try {
            const resumo = await AdminModel.buscarResumo();

            return res.json(resumo);
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                erro: "Erro ao carregar o resumo administrativo."
            });
        }
    }

    async listarPontos(req, res) {
        try {
            const pontos = await AdminModel.listarPontos();

            return res.json(pontos);
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                erro: "Erro ao listar os pontos."
            });
        }
    }

    async buscarPontoPorId(req, res) {
        try {
            const { id } = req.params;

            const ponto = await AdminModel.buscarPontoPorId(id);

            if (!ponto) {
                return res.status(404).json({
                    erro: "Ponto de coleta não encontrado."
                });
            }

            return res.json(ponto);
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                erro: "Erro ao carregar os detalhes do ponto."
            });
        }
    }

    async aprovarPonto(req, res) {
        try {
            const { id } = req.params;

            const ponto = await AdminModel.buscarPontoPorId(id);

            if (!ponto) {
                return res.status(404).json({
                    erro: "Ponto de coleta não encontrado."
                });
            }

            await AdminModel.aprovar(id);

            return res.json({
                mensagem: "Ponto aprovado com sucesso."
            });
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                erro: "Erro ao aprovar o ponto."
            });
        }
    }

    async rejeitarPonto(req, res) {
        try {
            const { id } = req.params;
            const { motivo } = req.body;

            if (!motivo || !String(motivo).trim()) {
                return res.status(400).json({
                    erro: "Informe o motivo da rejeição."
                });
            }

            const ponto = await AdminModel.buscarPontoPorId(id);

            if (!ponto) {
                return res.status(404).json({
                    erro: "Ponto de coleta não encontrado."
                });
            }

            await AdminModel.rejeitar(
                id,
                String(motivo).trim()
            );

            return res.json({
                mensagem: "Ponto rejeitado com sucesso."
            });
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                erro: "Erro ao rejeitar o ponto."
            });
        }
    }

    async aprovarExclusaoPonto(req, res) {
        try {
            const { id } = req.params;

            const ponto = await AdminModel.buscarPontoPorId(id);

            if (!ponto) {
                return res.status(404).json({
                    erro: "Ponto de coleta não encontrado."
                });
            }

            if (ponto.exclusao_status !== "PENDENTE") {
                return res.status(400).json({
                    erro: "Este ponto não possui solicitação de exclusão pendente."
                });
            }

            await AdminModel.aprovarExclusao(id);

            return res.json({
                mensagem: "Solicitação aprovada e ponto excluído com sucesso."
            });
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                erro: "Erro ao aprovar a exclusão do ponto."
            });
        }
    }

    async rejeitarExclusaoPonto(req, res) {
        try {
            const { id } = req.params;

            const ponto = await AdminModel.buscarPontoPorId(id);

            if (!ponto) {
                return res.status(404).json({
                    erro: "Ponto de coleta não encontrado."
                });
            }

            if (ponto.exclusao_status !== "PENDENTE") {
                return res.status(400).json({
                    erro: "Este ponto não possui solicitação de exclusão pendente."
                });
            }

            await AdminModel.rejeitarExclusao(id);

            return res.json({
                mensagem: "Solicitação de exclusão rejeitada."
            });
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                erro: "Erro ao rejeitar a exclusão do ponto."
            });
        }
    }
}

module.exports = new AdminController();
