const bcrypt = require("bcryptjs");
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

    async atualizar(req, res) {

        try {

            const { nome, email, perfil } = req.body;

            await usuarioModel.atualizar(
                req.params.id,
                nome,
                email,
                perfil
            );

            return res.json({
                mensagem: "Usuário atualizado com sucesso."
            });

        } catch (erro) {

            console.error(erro);

            return res.status(500).json({
                erro: "Erro ao atualizar usuário."
            });

        }

    },

    async excluir(req, res) {

        try {

            await usuarioModel.excluir(req.params.id);

            return res.json({
                mensagem: "Usuário removido com sucesso."
            });

        } catch (erro) {

            console.error(erro);

            return res.status(500).json({
                erro: "Erro ao excluir usuário."
            });

        }

    }

};