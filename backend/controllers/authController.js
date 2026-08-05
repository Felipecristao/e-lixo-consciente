const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const usuarioModel = require("../models/usuarioModel");
const gerarToken = require("../utils/jwt");

module.exports = {

    async register(req, res) {

        try {

            const { nome, senha } = req.body;
            const email = normalizarEmail(req.body.email);

            if (!nome || !email || !senha) {

                return res.status(400).json({
                    erro: "Preencha todos os campos."
                });

            }

            if (!emailValido(email)) {
                return res.status(400).json({
                    erro: "Informe um e-mail valido."
                });
            }

            if (String(senha).length < 8) {
                return res.status(400).json({
                    erro: "A senha deve ter pelo menos 8 caracteres."
                });
            }

            const usuarioExiste = await usuarioModel.buscarPorEmail(email);

            if (usuarioExiste) {

                return res.status(400).json({
                    erro: "E-mail já cadastrado."
                });

            }

            const senhaHash = await bcrypt.hash(senha, 10);

            const id = await usuarioModel.criar({

                nome: String(nome).trim(),
                email,
                senha: senhaHash,
                perfil: "USUARIO"

            });

            const token = gerarToken({

                id,
                email,
                perfil: "USUARIO"

            });

            return res.status(201).json({

                mensagem: "Usuário criado com sucesso.",

                token,

                usuario: {

                    id,
                    nome: String(nome).trim(),
                    email,
                    perfil: "USUARIO"

                }

            });

        } catch (erro) {

            console.error(erro);

            return res.status(500).json({
                erro: "Erro interno do servidor."
            });

        }

    },

    async login(req, res) {

        try {

            const { senha } = req.body;
            const email = normalizarEmail(req.body.email);

            if (!email || !senha) {

                return res.status(400).json({
                    erro: "Informe e-mail e senha."
                });

            }

            if (!emailValido(email)) {
                return res.status(400).json({
                    erro: "Informe um e-mail valido."
                });
            }

            const usuario = await usuarioModel.buscarPorEmail(email);

            if (!usuario) {

                return res.status(401).json({
                    erro: "Usuário ou senha inválidos."
                });

            }

            const senhaValida = await bcrypt.compare(
                senha,
                usuario.senha
            );

            if (!senhaValida) {

                return res.status(401).json({
                    erro: "Usuário ou senha inválidos."
                });

            }

            if (!Number(usuario.ativo)) {
                return res.status(403).json({
                    erro: "Esta conta está inativa. Procure um administrador."
                });
            }

            const token = gerarToken({

                id: usuario.id,
                email: usuario.email,
                perfil: usuario.perfil

            });

            return res.json({

                mensagem: "Login realizado com sucesso.",

                token,

                usuario: {

                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    perfil: usuario.perfil

                }

            });

        } catch (erro) {

            console.error(erro);

            return res.status(500).json({
                erro: "Erro interno do servidor."
            });

        }

    },

    async me(req, res) {

        try {

            const usuario = await usuarioModel.buscarPorId(req.usuario.id);

            if (!usuario) {

                return res.status(404).json({
                    erro: "Usuário não encontrado."
                });

            }

            return res.json(formatarUsuarioPerfil(usuario));

        } catch (erro) {

            console.error(erro);

            return res.status(500).json({
                erro: "Erro interno do servidor."
            });

        }

    },

    async atualizarMe(req, res) {

        try {

            const usuarioAtual =
                await usuarioModel.buscarPorId(req.usuario.id);

            if (!usuarioAtual) {

                return res.status(404).json({
                    erro: "Usuario nao encontrado."
                });

            }

            const {
                nome,
                telefone,
                data_nascimento,
                cep,
                rua,
                numero,
                bairro,
                cidade,
                estado,
                complemento
            } = req.body;

            if (!nome || !String(nome).trim()) {

                return res.status(400).json({
                    erro: "Informe o nome."
                });

            }

            const dataNascimentoNormalizada =
                normalizarDataOpcional(data_nascimento);

            if (dataNascimentoNormalizada === false) {

                return res.status(400).json({
                    erro: "Informe uma data de nascimento valida."
                });

            }

            await usuarioModel.atualizarPerfil(
                req.usuario.id,
                {
                    nome: String(nome).trim(),
                    telefone: normalizarTextoOpcional(telefone),
                    data_nascimento: dataNascimentoNormalizada,
                    cep: normalizarTextoOpcional(cep),
                    rua: normalizarTextoOpcional(rua),
                    numero: normalizarTextoOpcional(numero),
                    bairro: normalizarTextoOpcional(bairro),
                    cidade: normalizarTextoOpcional(cidade),
                    estado: estado
                        ? String(estado).trim().toUpperCase()
                        : null,
                    complemento: normalizarTextoOpcional(complemento)
                }
            );

            const usuarioAtualizado =
                await usuarioModel.buscarPorId(req.usuario.id);

            return res.json({
                mensagem: "Perfil atualizado com sucesso.",
                usuario: formatarUsuarioPerfil(usuarioAtualizado)
            });

        } catch (erro) {

            console.error(erro);

            return res.status(500).json({
                erro: "Erro interno do servidor."
            });

        }

    },

    async alterarSenha(req, res) {

        try {

            const {
                senha_atual,
                nova_senha,
                confirmar_senha
            } = req.body;

            if (
                !senha_atual ||
                !nova_senha ||
                !confirmar_senha
            ) {
                return res.status(400).json({
                    erro: "Preencha todos os campos de senha."
                });
            }

            if (String(nova_senha).length < 8) {
                return res.status(400).json({
                    erro: "A nova senha deve ter pelo menos 8 caracteres."
                });
            }

            if (nova_senha !== confirmar_senha) {
                return res.status(400).json({
                    erro: "A confirmação da senha não confere."
                });
            }

            const usuario =
                await usuarioModel.buscarPorEmail(req.usuario.email);

            if (!usuario) {
                return res.status(404).json({
                    erro: "Usuário não encontrado."
                });
            }

            const senhaAtualValida =
                await bcrypt.compare(
                    senha_atual,
                    usuario.senha
                );

            if (!senhaAtualValida) {
                return res.status(400).json({
                    erro: "Senha atual incorreta."
                });
            }

            const senhaHash =
                await bcrypt.hash(nova_senha, 10);

            await usuarioModel.atualizarSenha(
                req.usuario.id,
                senhaHash
            );

            return res.json({
                mensagem: "Senha alterada com sucesso."
            });

        } catch (erro) {

            console.error(erro);

            return res.status(500).json({
                erro: "Erro interno do servidor."
            });

        }

    },

    async esqueciSenha(req, res) {

        try {

            const email = normalizarEmail(req.body.email);

            if (!email || !String(email).trim()) {
                return res.status(400).json({
                    erro: "Informe o e-mail."
                });
            }

            const usuario =
                await usuarioModel.buscarPorEmail(email);

            if (!usuario) {
                return res.json({
                    mensagem:
                        "Se o e-mail estiver cadastrado, uma recuperação será gerada."
                });
            }

            const token =
                crypto.randomBytes(32).toString("hex");
            const tokenHash = gerarHashToken(token);

            const expiraEm =
                new Date(Date.now() + 60 * 60 * 1000);

            await usuarioModel.criarTokenRecuperacao(
                usuario.id,
                tokenHash,
                formatarDataMariaDB(expiraEm)
            );

            if (process.env.NODE_ENV === "production") {
                return res.json({
                    mensagem:
                        "Se o e-mail estiver cadastrado, uma recuperacao sera enviada."
                });
            }

            return res.json({
                mensagem:
                    "Token de recuperação gerado. Em produção, esse link seria enviado por e-mail.",
                link: `redefinir-senha.html?token=${token}`,
                token
            });

        } catch (erro) {

            console.error(erro);

            return res.status(500).json({
                erro: "Erro interno do servidor."
            });

        }

    },

    async redefinirSenha(req, res) {

        try {

            const {
                token,
                nova_senha,
                confirmar_senha
            } = req.body;

            if (
                !token ||
                !nova_senha ||
                !confirmar_senha
            ) {
                return res.status(400).json({
                    erro: "Preencha todos os campos."
                });
            }

            if (String(nova_senha).length < 8) {
                return res.status(400).json({
                    erro: "A nova senha deve ter pelo menos 8 caracteres."
                });
            }

            if (nova_senha !== confirmar_senha) {
                return res.status(400).json({
                    erro: "A confirmação da senha não confere."
                });
            }

            const recuperacao =
                await usuarioModel.buscarTokenRecuperacao(
                    gerarHashToken(token)
                );

            if (!recuperacao || recuperacao.usado_em) {
                return res.status(400).json({
                    erro: "Token inválido ou já utilizado."
                });
            }

            if (
                Number(recuperacao.expirado) === 1
            ) {
                return res.status(400).json({
                    erro: "Token expirado. Solicite uma nova recuperação."
                });
            }

            const senhaHash =
                await bcrypt.hash(nova_senha, 10);

            await usuarioModel.atualizarSenha(
                recuperacao.usuario_id,
                senhaHash
            );

            await usuarioModel.marcarTokenRecuperacaoUsado(
                recuperacao.id
            );

            return res.json({
                mensagem: "Senha redefinida com sucesso."
            });

        } catch (erro) {

            console.error(erro);

            return res.status(500).json({
                erro: "Erro interno do servidor."
            });

        }

    }

};

function formatarUsuarioPerfil(usuario) {
    return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        data_nascimento: formatarDataInput(usuario.data_nascimento),
        cep: usuario.cep,
        rua: usuario.rua,
        numero: usuario.numero,
        bairro: usuario.bairro,
        cidade: usuario.cidade,
        estado: usuario.estado,
        complemento: usuario.complemento,
        perfil: usuario.perfil
    };
}

function normalizarTextoOpcional(valor) {
    const texto = String(valor || "").trim();

    return texto || null;
}

function normalizarEmail(valor) {
    return String(valor || "").trim().toLowerCase();
}

function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function gerarHashToken(token) {
    return crypto
        .createHash("sha256")
        .update(String(token || ""))
        .digest("hex");
}

function normalizarDataOpcional(valor) {
    const texto = String(valor || "").trim();

    if (!texto) {
        return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        return false;
    }

    return texto;
}

function formatarDataInput(valor) {
    if (!valor) {
        return null;
    }

    if (typeof valor === "string") {
        return valor.slice(0, 10);
    }

    if (valor instanceof Date) {
        return valor.toISOString().slice(0, 10);
    }

    return null;
}

function formatarDataMariaDB(data) {
    return data
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
}
