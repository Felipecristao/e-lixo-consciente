const PontoModel = require("../models/pontoModel");

class PontosController {

    async listar(req, res) {
        try {
            const pontos = await PontoModel.listarAprovados();

            return res.json(pontos);
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                erro: "Erro ao listar pontos de coleta."
            });
        }
    }

    async listarPendentes(req, res) {
        try {
            const pontos = await PontoModel.listarPendentes();

            return res.json(pontos);
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                erro: "Erro ao listar pontos pendentes."
            });
        }
    }

    async listarMeus(req, res) {
        try {
            const pontos = await PontoModel.listarPorUsuario(
                req.usuario.id
            );

            return res.json(pontos);
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                erro: "Erro ao listar seus pontos."
            });
        }
    }

    async buscarPorId(req, res) {
        try {
            const ponto = await PontoModel.buscarPorId(
                req.params.id
            );

            if (!ponto) {
                return res.status(404).json({
                    erro: "Ponto de coleta não encontrado."
                });
            }

            if (ponto.status !== "APROVADO") {
                return res.status(404).json({
                    erro: "Ponto de coleta nao encontrado."
                });
            }

            return res.json(ponto);
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                erro: "Erro ao buscar ponto de coleta."
            });
        }
    }

    async criar(req, res) {
        try {
            const {
                nome,
                descricao,
                tipo_ponto_id,
                cep,
                rua,
                numero,
                bairro,
                cidade,
                estado,
                latitude,
                longitude,
                telefone,
                horario_funcionamento,
                site,
                observacoes,
                materiais
            } = req.body;

            if (
                !nome ||
                !tipo_ponto_id ||
                !cep ||
                !rua ||
                !numero ||
                !bairro ||
                !cidade ||
                !estado ||
                !telefone ||
                !String(telefone).trim() ||
                !horario_funcionamento ||
                !String(horario_funcionamento).trim()
            ) {
                return res.status(400).json({
                    erro: "Preencha todos os campos obrigatórios."
                });
            }

            if (
                !Array.isArray(materiais) ||
                materiais.length === 0
            ) {
                return res.status(400).json({
                    erro: "Selecione pelo menos um material aceito."
                });
            }

            const materiaisNormalizados = [
                ...new Set(
                    materiais
                        .map(Number)
                        .filter(
                            (id) =>
                                Number.isInteger(id) &&
                                id > 0
                        )
                )
            ];

            if (materiaisNormalizados.length === 0) {
                return res.status(400).json({
                    erro: "Os materiais informados são inválidos."
                });
            }

            const ehAdmin = req.usuario.perfil === "ADMIN";
            const statusInicial = ehAdmin
                ? "APROVADO"
                : "PENDENTE";

            const id = await PontoModel.criar({
                nome: String(nome)
                    .trim()
                    .toUpperCase(),
                descricao: descricao
                    ? String(descricao).trim()
                    : null,

                tipo_ponto_id: Number(tipo_ponto_id),

                cep: String(cep).trim(),
                rua: String(rua).trim(),
                numero: String(numero).trim(),
                bairro: String(bairro).trim(),
                cidade: String(cidade).trim(),
                estado: String(estado)
                    .trim()
                    .toUpperCase(),

                latitude:
                    latitude !== undefined &&
                    latitude !== null &&
                    latitude !== ""
                        ? Number(latitude)
                        : null,

                longitude:
                    longitude !== undefined &&
                    longitude !== null &&
                    longitude !== ""
                        ? Number(longitude)
                        : null,

                telefone: String(telefone).trim(),

                horario_funcionamento:
                    String(horario_funcionamento).trim(),

                site: site
                    ? String(site).trim()
                    : null,

                observacoes: observacoes
                    ? String(observacoes).trim()
                    : null,

                materiais: materiaisNormalizados,

                usuario_id: req.usuario.id,
                status: statusInicial
            });

            return res.status(201).json({
                mensagem: ehAdmin
                    ? "Ponto cadastrado e publicado com sucesso."
                    : "Ponto cadastrado e enviado para aprovação.",

                ponto: {
                    id,
                    nome: String(nome).trim(),
                    status: statusInicial
                }
            });
        } catch (erro) {
            console.error(erro);

            if (
                erro.code ===
                "ER_NO_REFERENCED_ROW_2"
            ) {
                return res.status(400).json({
                    erro:
                        "Tipo de ponto ou material informado não existe."
                });
            }

            if (
                erro.code === "ER_DUP_ENTRY"
            ) {
                return res.status(400).json({
                    erro:
                        "Existe informação duplicada no cadastro."
                });
            }

            return res.status(500).json({
                erro: "Erro ao cadastrar ponto de coleta."
            });
        }
    }

    async atualizarStatus(req, res) {
        try {
            const status = String(
                req.body.status || ""
            ).toUpperCase();

            if (
                !["APROVADO", "REJEITADO"].includes(
                    status
                )
            ) {
                return res.status(400).json({
                    erro:
                        "Status inválido. Use APROVADO ou REJEITADO."
                });
            }

            const ponto = await PontoModel.buscarPorId(
                req.params.id
            );

            if (!ponto) {
                return res.status(404).json({
                    erro: "Ponto de coleta não encontrado."
                });
            }

            await PontoModel.atualizarStatus(
                req.params.id,
                status
            );

            return res.json({
                mensagem:
                    status === "APROVADO"
                        ? "Ponto aprovado com sucesso."
                        : "Ponto rejeitado com sucesso."
            });
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                erro:
                    "Erro ao atualizar status do ponto."
            });
        }
    }

    async solicitarExclusao(req, res) {
        try {
            const { id } = req.params;
            const { motivo } = req.body;

            if (!motivo || !String(motivo).trim()) {
                return res.status(400).json({
                    erro: "Informe o motivo da solicitação de exclusão."
                });
            }

            const ponto = await PontoModel.buscarPorId(id);

            if (!ponto) {
                return res.status(404).json({
                    erro: "Ponto de coleta não encontrado."
                });
            }

            if (Number(ponto.usuario_id) !== Number(req.usuario.id)) {
                return res.status(403).json({
                    erro: "Você só pode solicitar a exclusão dos pontos que cadastrou."
                });
            }

            if (ponto.exclusao_status === "PENDENTE") {
                return res.status(400).json({
                    erro: "Este ponto já possui uma solicitação de exclusão pendente."
                });
            }

            await PontoModel.solicitarExclusao(
                id,
                req.usuario.id,
                String(motivo).trim()
            );

            return res.json({
                mensagem: "Solicitação de exclusão enviada para análise."
            });
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                erro: "Erro ao solicitar a exclusão do ponto."
            });
        }
    }

    async atualizar(req, res) {
        try {
            const pontoExistente =
                await PontoModel.buscarPorId(
                    req.params.id
                );

            if (!pontoExistente) {
                return res.status(404).json({
                    erro: "Ponto de coleta não encontrado."
                });
            }

            const {
                nome,
                descricao,
                tipo_ponto_id,
                cep,
                rua,
                numero,
                bairro,
                cidade,
                estado,
                latitude,
                longitude,
                telefone,
                horario_funcionamento,
                site,
                observacoes,
                materiais
            } = req.body;

            let materiaisAtualizados;

            if (materiais !== undefined) {
                if (
                    !Array.isArray(materiais) ||
                    materiais.length === 0
                ) {
                    return res.status(400).json({
                        erro:
                            "Selecione pelo menos um material aceito."
                    });
                }

                materiaisAtualizados = [
                    ...new Set(
                        materiais
                            .map(Number)
                            .filter(
                                (id) =>
                                    Number.isInteger(id) &&
                                    id > 0
                            )
                    )
                ];

                if (
                    materiaisAtualizados.length === 0
                ) {
                    return res.status(400).json({
                        erro:
                            "Os materiais informados são inválidos."
                    });
                }
            }

            await PontoModel.atualizar(
                req.params.id,
                {
                    nome:
                        nome !== undefined
                            ? String(nome).trim().toUpperCase()
                            : pontoExistente.nome,

                    descricao:
                        descricao !== undefined
                            ? String(
                                  descricao || ""
                              ).trim() || null
                            : pontoExistente.descricao,

                    tipo_ponto_id:
                        tipo_ponto_id !== undefined
                            ? Number(tipo_ponto_id)
                            : pontoExistente.tipo_ponto_id,

                    cep:
                        cep !== undefined
                            ? String(cep).trim()
                            : pontoExistente.cep,

                    rua:
                        rua !== undefined
                            ? String(rua).trim()
                            : pontoExistente.rua,

                    numero:
                        numero !== undefined
                            ? String(numero).trim()
                            : pontoExistente.numero,

                    bairro:
                        bairro !== undefined
                            ? String(bairro).trim()
                            : pontoExistente.bairro,

                    cidade:
                        cidade !== undefined
                            ? String(cidade).trim()
                            : pontoExistente.cidade,

                    estado:
                        estado !== undefined
                            ? String(estado)
                                  .trim()
                                  .toUpperCase()
                            : pontoExistente.estado,

                    latitude:
                        latitude !== undefined
                            ? latitude === "" ||
                              latitude === null
                                ? null
                                : Number(latitude)
                            : pontoExistente.latitude,

                    longitude:
                        longitude !== undefined
                            ? longitude === "" ||
                              longitude === null
                                ? null
                                : Number(longitude)
                            : pontoExistente.longitude,

                    telefone:
                        telefone !== undefined
                            ? String(
                                  telefone || ""
                              ).trim() || null
                            : pontoExistente.telefone,

                    horario_funcionamento:
                        horario_funcionamento !== undefined
                            ? String(
                                  horario_funcionamento || ""
                              ).trim() || null
                            : pontoExistente.horario_funcionamento,

                    site:
                        site !== undefined
                            ? String(
                                  site || ""
                              ).trim() || null
                            : pontoExistente.site,

                    observacoes:
                        observacoes !== undefined
                            ? String(
                                  observacoes || ""
                              ).trim() || null
                            : pontoExistente.observacoes,

                    materiais: materiaisAtualizados
                }
            );

            return res.json({
                mensagem:
                    "Ponto de coleta atualizado com sucesso."
            });
        } catch (erro) {
            console.error(erro);

            if (
                erro.code ===
                "ER_NO_REFERENCED_ROW_2"
            ) {
                return res.status(400).json({
                    erro:
                        "Tipo de ponto ou material informado não existe."
                });
            }

            return res.status(500).json({
                erro:
                    "Erro ao atualizar ponto de coleta."
            });
        }
    }

    async excluir(req, res) {
        try {
            const quantidade =
                await PontoModel.excluir(
                    req.params.id
                );

            if (!quantidade) {
                return res.status(404).json({
                    erro: "Ponto de coleta não encontrado."
                });
            }

            return res.json({
                mensagem:
                    "Ponto de coleta excluído com sucesso."
            });
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                erro:
                    "Erro ao excluir ponto de coleta."
            });
        }
    }
}

module.exports = new PontosController();
