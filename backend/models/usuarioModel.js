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
                perfil
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

    async atualizar(id, nome, email, perfil) {

        await db.execute(
            `
            UPDATE usuarios
            SET
                nome = ?,
                email = ?,
                perfil = ?
            WHERE id = ?
            `,
            [
                nome,
                email,
                perfil,
                id
            ]
        );

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

    },

    async excluir(id) {

        await db.execute(
            `
            DELETE FROM usuarios
            WHERE id = ?
            `,
            [id]
        );

    }

};
