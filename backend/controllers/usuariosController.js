const usuarioModel = require("../models/usuarioModel");

module.exports = {
    async listar(req, res) {
        try {
            const usuarios = await usuarioModel.listar();
            return res.json(usuarios);
        } catch (erro) {
            console.error(erro);
            return res.status(500).json({
                erro: "Erro ao listar usuários."
            });
        }
    },

    async buscarPorId(req, res) {
        try {
            const usuario = await usuarioModel.buscarPorId(req.params.id);

            if (!usuario) {
                return res.status(404).json({
                    erro: "Usuário não encontrado."
                });
            }

            return res.json(usuario);
        } catch (erro) {
            console.error(erro);
            return res.status(500).json({
                erro: "Erro ao buscar usuário."
            });
        }
    },

    async alterarPerfil(req, res) {
        try {
            const usuarioId = Number(req.params.id);
            const perfil = String(req.body.perfil || "").toUpperCase();

            if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
                return res.status(400).json({ erro: "Usuário inválido." });
            }

            if (!["USUARIO", "ADMIN"].includes(perfil)) {
                return res.status(400).json({ erro: "Perfil inválido." });
            }

            const usuario = await usuarioModel.alterarPerfilSeguro({
                usuarioId,
                solicitanteId: Number(req.usuario.id),
                perfil
            });

            return res.json({
                mensagem: perfil === "ADMIN"
                    ? "Usuário promovido a administrador."
                    : "Usuário alterado para colaborador.",
                usuario
            });
        } catch (erro) {
            if (erro.codigo === "USUARIO_NAO_ENCONTRADO") {
                return res.status(404).json({ erro: erro.message });
            }

            if (
                erro.codigo === "PROPRIO_ACESSO" ||
                erro.codigo === "ULTIMO_ADMIN"
            ) {
                return res.status(409).json({ erro: erro.message });
            }

            console.error(erro);
            return res.status(500).json({
                erro: "Erro ao alterar o perfil do usuário."
            });
        }
    },

    async alterarStatus(req, res) {
        try {
            const usuarioId = Number(req.params.id);
            const ativo = req.body.ativo;

            if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
                return res.status(400).json({ erro: "Usuário inválido." });
            }

            if (typeof ativo !== "boolean") {
                return res.status(400).json({ erro: "Status inválido." });
            }

            const usuario = await usuarioModel.alterarStatusSeguro({
                usuarioId,
                solicitanteId: Number(req.usuario.id),
                ativo
            });

            return res.json({
                mensagem: ativo
                    ? "Usuário reativado com sucesso."
                    : "Usuário inativado com sucesso.",
                usuario
            });
        } catch (erro) {
            if (erro.codigo === "USUARIO_NAO_ENCONTRADO") {
                return res.status(404).json({ erro: erro.message });
            }

            if (erro.codigo === "PROPRIA_CONTA" || erro.codigo === "ULTIMO_ADMIN") {
                return res.status(409).json({ erro: erro.message });
            }

            console.error(erro);
            return res.status(500).json({
                erro: "Erro ao alterar o status do usuário."
            });
        }
    }
};
