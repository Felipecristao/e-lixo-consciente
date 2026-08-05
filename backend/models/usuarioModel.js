const db = require("../config/database");

module.exports = {

    async listar() {

        const [rows] = await db.execute(`
            SELECT
                id,
                nome,
                email,
                telefone,
                data_nascimento,
                cep,
                rua,
                numero,
                bairro,
                cidade,
                estado,
                complemento,
                perfil,
                ativo,
                criado_em
            FROM usuarios
            ORDER BY nome
        `);

        return rows;

    },

    async buscarPorEmail(email) {

        const [rows] = await db.execute(
            `
            SELECT
                id,
                nome,
                email,
                senha,
                telefone,
                data_nascimento,
                cep,
                rua,
                numero,
                bairro,
                cidade,
                estado,
                complemento,
                perfil,
                ativo
            FROM usuarios
            WHERE email = ?
            LIMIT 1
            `,
            [email]
        );

        return rows.length ? rows[0] : null;

    },

    async buscarPorId(id) {

        const [rows] = await db.execute(
            `
            SELECT
                id,
                nome,
                email,
                telefone,
                data_nascimento,
                cep,
                rua,
                numero,
                bairro,
                cidade,
                estado,
                complemento,
                perfil,
                ativo,
                criado_em
            FROM usuarios
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        return rows.length ? rows[0] : null;

    },

    async criar(usuario) {

        const [result] = await db.execute(
            `
            INSERT INTO usuarios
            (
                nome,
                email,
                senha,
                perfil
            )
            VALUES
            (
                ?,
                ?,
                ?,
                ?
            )
            `,
            [
                usuario.nome,
                usuario.email,
                usuario.senha,
                usuario.perfil
            ]
        );

        return result.insertId;

    },

    async alterarPerfilSeguro({ usuarioId, solicitanteId, perfil }) {
        const conexao = await db.getConnection();

        try {
            await conexao.beginTransaction();

            const [usuarios] = await conexao.execute(
                `
                SELECT id, nome, email, perfil, ativo
                FROM usuarios
                WHERE id = ?
                LIMIT 1
                FOR UPDATE
                `,
                [usuarioId]
            );

            if (!usuarios.length) {
                const erro = new Error("Usuário não encontrado.");
                erro.codigo = "USUARIO_NAO_ENCONTRADO";
                throw erro;
            }

            const usuario = usuarios[0];

            if (usuarioId === solicitanteId && perfil !== "ADMIN") {
                const erro = new Error(
                    "Você não pode remover o próprio acesso administrativo."
                );
                erro.codigo = "PROPRIO_ACESSO";
                throw erro;
            }

            if (usuario.perfil === "ADMIN" && perfil === "USUARIO") {
                const [administradores] = await conexao.execute(
                    `
                    SELECT id
                    FROM usuarios
                    WHERE perfil = 'ADMIN' AND ativo = 1
                    FOR UPDATE
                    `
                );

                if (administradores.length <= 1) {
                    const erro = new Error(
                        "O último administrador do sistema não pode ser removido."
                    );
                    erro.codigo = "ULTIMO_ADMIN";
                    throw erro;
                }
            }

            await conexao.execute(
                "UPDATE usuarios SET perfil = ? WHERE id = ?",
                [perfil, usuarioId]
            );

            await conexao.commit();

            return {
                ...usuario,
                perfil
            };
        } catch (erro) {
            await conexao.rollback();
            throw erro;
        } finally {
            conexao.release();
        }
    },

    async alterarStatusSeguro({ usuarioId, solicitanteId, ativo }) {
        const conexao = await db.getConnection();

        try {
            await conexao.beginTransaction();

            const [usuarios] = await conexao.execute(
                `
                SELECT id, nome, email, perfil, ativo
                FROM usuarios
                WHERE id = ?
                LIMIT 1
                FOR UPDATE
                `,
                [usuarioId]
            );

            if (!usuarios.length) {
                const erro = new Error("Usuário não encontrado.");
                erro.codigo = "USUARIO_NAO_ENCONTRADO";
                throw erro;
            }

            const usuario = usuarios[0];

            if (usuarioId === solicitanteId && !ativo) {
                const erro = new Error("Você não pode inativar a própria conta.");
                erro.codigo = "PROPRIA_CONTA";
                throw erro;
            }

            if (usuario.perfil === "ADMIN" && Number(usuario.ativo) && !ativo) {
                const [administradores] = await conexao.execute(
                    `
                    SELECT id
                    FROM usuarios
                    WHERE perfil = 'ADMIN' AND ativo = 1
                    FOR UPDATE
                    `
                );

                if (administradores.length <= 1) {
                    const erro = new Error("O último administrador ativo não pode ser inativado.");
                    erro.codigo = "ULTIMO_ADMIN";
                    throw erro;
                }
            }

            await conexao.execute(
                "UPDATE usuarios SET ativo = ? WHERE id = ?",
                [ativo ? 1 : 0, usuarioId]
            );

            await conexao.commit();

            return { ...usuario, ativo: ativo ? 1 : 0 };
        } catch (erro) {
            await conexao.rollback();
            throw erro;
        } finally {
            conexao.release();
        }
    },

    async atualizarPerfil(id, usuario) {

        await db.execute(
            `
            UPDATE usuarios
            SET
                nome = ?,
                telefone = ?,
                data_nascimento = ?,
                cep = ?,
                rua = ?,
                numero = ?,
                bairro = ?,
                cidade = ?,
                estado = ?,
                complemento = ?
            WHERE id = ?
            `,
            [
                usuario.nome,
                usuario.telefone,
                usuario.data_nascimento,
                usuario.cep,
                usuario.rua,
                usuario.numero,
                usuario.bairro,
                usuario.cidade,
                usuario.estado,
                usuario.complemento,
                id
            ]
        );

    },

    async atualizarSenha(id, senhaHash) {

        await db.execute(
            `
            UPDATE usuarios
            SET senha = ?
            WHERE id = ?
            `,
            [
                senhaHash,
                id
            ]
        );

    },

    async criarTokenRecuperacao(usuarioId, token, expiraEm) {

        await db.execute(
            `
            INSERT INTO recuperacao_senha
            (
                usuario_id,
                token,
                expira_em
            )
            VALUES (?, ?, ?)
            `,
            [
                usuarioId,
                token,
                expiraEm
            ]
        );

    },

    async buscarTokenRecuperacao(token) {

        const [rows] = await db.execute(
            `
            SELECT
                rs.id,
                rs.usuario_id,
                rs.token,
                rs.expira_em,
                rs.usado_em,
                rs.expira_em < NOW() AS expirado,
                u.email,
                u.nome
            FROM recuperacao_senha rs
            INNER JOIN usuarios u
                ON u.id = rs.usuario_id
            WHERE rs.token = ?
            LIMIT 1
            `,
            [token]
        );

        return rows.length ? rows[0] : null;

    },

    async marcarTokenRecuperacaoUsado(id) {

        await db.execute(
            `
            UPDATE recuperacao_senha
            SET usado_em = NOW()
            WHERE id = ?
            `,
            [id]
        );

    }

};
