const db = require("../config/database");

class PontoModel {

    async listarAprovados() {
        const [rows] = await db.execute(`
            SELECT
                p.id,
                p.nome,
                p.descricao,
                p.tipo_ponto_id,
                tp.nome AS tipo_ponto,
                p.endereco,
                p.rua,
                p.numero,
                p.bairro,
                p.cidade,
                p.estado,
                p.cep,
                p.latitude,
                p.longitude,
                p.telefone,
                p.horario_funcionamento,
                p.site,
                p.observacoes,
                p.status,
                p.exclusao_status,
                p.exclusao_motivo,
                p.exclusao_solicitada_em,
                p.usuario_id,
                p.criado_em,
                p.atualizado_em,
                (
                    SELECT GROUP_CONCAT(
                        m.nome
                        ORDER BY m.nome
                        SEPARATOR ', '
                    )
                    FROM ponto_materiais pm
                    INNER JOIN materiais m
                        ON m.id = pm.material_id
                    WHERE pm.ponto_id = p.id
                ) AS materiais
            FROM pontos_coleta p
            LEFT JOIN tipos_ponto tp
                ON tp.id = p.tipo_ponto_id
            WHERE p.status = 'APROVADO'
            ORDER BY p.criado_em DESC
        `);

        return rows;
    }

    async listarPendentes() {
        const [rows] = await db.execute(`
            SELECT
                p.id,
                p.nome,
                p.descricao,
                p.tipo_ponto_id,
                tp.nome AS tipo_ponto,
                p.endereco,
                p.rua,
                p.numero,
                p.bairro,
                p.cidade,
                p.estado,
                p.cep,
                p.latitude,
                p.longitude,
                p.telefone,
                p.horario_funcionamento,
                p.site,
                p.observacoes,
                p.status,
                p.exclusao_status,
                p.exclusao_motivo,
                p.exclusao_solicitada_em,
                p.usuario_id,
                p.criado_em,
                p.atualizado_em
            FROM pontos_coleta p
            LEFT JOIN tipos_ponto tp
                ON tp.id = p.tipo_ponto_id
            WHERE p.status = 'PENDENTE'
            ORDER BY p.criado_em ASC
        `);

        return rows;
    }

    async listarPorUsuario(usuarioId) {
        const [rows] = await db.execute(
            `
            SELECT
                p.id,
                p.nome,
                p.descricao,
                p.tipo_ponto_id,
                tp.nome AS tipo_ponto,
                p.endereco,
                p.rua,
                p.numero,
                p.bairro,
                p.cidade,
                p.estado,
                p.cep,
                p.latitude,
                p.longitude,
                p.telefone,
                p.horario_funcionamento,
                p.site,
                p.observacoes,
                p.status,
                p.exclusao_status,
                p.exclusao_motivo,
                p.exclusao_solicitada_em,
                p.usuario_id,
                p.criado_em,
                p.atualizado_em
            FROM pontos_coleta p
            LEFT JOIN tipos_ponto tp
                ON tp.id = p.tipo_ponto_id
            WHERE p.usuario_id = ?
            ORDER BY p.criado_em DESC
            `,
            [usuarioId]
        );

        return rows;
    }

    async buscarPorId(id) {
        const [rows] = await db.execute(
            `
            SELECT
                p.id,
                p.nome,
                p.descricao,
                p.tipo_ponto_id,
                tp.nome AS tipo_ponto,
                p.endereco,
                p.rua,
                p.numero,
                p.bairro,
                p.cidade,
                p.estado,
                p.cep,
                p.latitude,
                p.longitude,
                p.telefone,
                p.horario_funcionamento,
                p.site,
                p.observacoes,
                p.status,
                p.exclusao_status,
                p.exclusao_motivo,
                p.exclusao_solicitada_em,
                p.usuario_id,
                p.criado_em,
                p.atualizado_em
            FROM pontos_coleta p
            LEFT JOIN tipos_ponto tp
                ON tp.id = p.tipo_ponto_id
            WHERE p.id = ?
            LIMIT 1
            `,
            [id]
        );

        if (!rows.length) {
            return null;
        }

        const ponto = rows[0];

        ponto.materiais = await this.listarMateriais(id);

        return ponto;
    }

    async listarMateriais(pontoId) {
        const [rows] = await db.execute(
            `
            SELECT
                m.id,
                m.nome
            FROM ponto_materiais pm
            INNER JOIN materiais m
                ON m.id = pm.material_id
            WHERE pm.ponto_id = ?
            ORDER BY m.nome
            `,
            [pontoId]
        );

        return rows;
    }

    async criar(ponto) {
        const conexao = await db.getConnection();

        try {
            await conexao.beginTransaction();

            const enderecoCompleto = [
                ponto.rua,
                ponto.numero,
                ponto.bairro
            ]
                .filter(Boolean)
                .join(", ");

            const [result] = await conexao.execute(
                `
                INSERT INTO pontos_coleta
                (
                    nome,
                    descricao,
                    tipo_ponto_id,
                    endereco,
                    rua,
                    numero,
                    bairro,
                    cidade,
                    estado,
                    cep,
                    latitude,
                    longitude,
                    telefone,
                    horario_funcionamento,
                    site,
                    observacoes,
                    status,
                    aprovado_em,
                    usuario_id
                )
                VALUES
                (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
                `,
                [
                    ponto.nome,
                    ponto.descricao,
                    ponto.tipo_ponto_id,
                    enderecoCompleto || null,
                    ponto.rua,
                    ponto.numero,
                    ponto.bairro,
                    ponto.cidade,
                    ponto.estado,
                    ponto.cep,
                    ponto.latitude,
                    ponto.longitude,
                    ponto.telefone,
                    ponto.horario_funcionamento,
                    ponto.site,
                    ponto.observacoes,
                    ponto.status,
                    ponto.status === "APROVADO"
                        ? new Date()
                        : null,
                    ponto.usuario_id
                ]
            );

            const pontoId = result.insertId;

            if (
                Array.isArray(ponto.materiais) &&
                ponto.materiais.length > 0
            ) {
                for (const materialId of ponto.materiais) {
                    await conexao.execute(
                        `
                        INSERT INTO ponto_materiais
                        (
                            ponto_id,
                            material_id
                        )
                        VALUES (?, ?)
                        `,
                        [pontoId, materialId]
                    );
                }
            }

            await conexao.commit();

            return pontoId;
        } catch (erro) {
            await conexao.rollback();
            throw erro;
        } finally {
            conexao.release();
        }
    }

    async atualizarStatus(id, status) {
        const [result] = await db.execute(
            `
            UPDATE pontos_coleta
            SET status = ?
            WHERE id = ?
            `,
            [status, id]
        );

        return result.affectedRows;
    }

    async solicitarExclusao(id, usuarioId, motivo) {
        const [result] = await db.execute(
            `
            UPDATE pontos_coleta
            SET
                exclusao_status = 'PENDENTE',
                exclusao_motivo = ?,
                exclusao_solicitada_em = NOW()
            WHERE id = ?
              AND usuario_id = ?
              AND exclusao_status <> 'PENDENTE'
            `,
            [
                motivo,
                id,
                usuarioId
            ]
        );

        return result.affectedRows;
    }

    async atualizar(id, ponto) {
        const conexao = await db.getConnection();

        try {
            await conexao.beginTransaction();

            const enderecoCompleto = [
                ponto.rua,
                ponto.numero,
                ponto.bairro
            ]
                .filter(Boolean)
                .join(", ");

            const [result] = await conexao.execute(
                `
                UPDATE pontos_coleta
                SET
                    nome = ?,
                    descricao = ?,
                    tipo_ponto_id = ?,
                    endereco = ?,
                    rua = ?,
                    numero = ?,
                    bairro = ?,
                    cidade = ?,
                    estado = ?,
                    cep = ?,
                    latitude = ?,
                    longitude = ?,
                    telefone = ?,
                    horario_funcionamento = ?,
                    site = ?,
                    observacoes = ?
                WHERE id = ?
                `,
                [
                    ponto.nome,
                    ponto.descricao,
                    ponto.tipo_ponto_id,
                    enderecoCompleto || null,
                    ponto.rua,
                    ponto.numero,
                    ponto.bairro,
                    ponto.cidade,
                    ponto.estado,
                    ponto.cep,
                    ponto.latitude,
                    ponto.longitude,
                    ponto.telefone,
                    ponto.horario_funcionamento,
                    ponto.site,
                    ponto.observacoes,
                    id
                ]
            );

            if (Array.isArray(ponto.materiais)) {
                await conexao.execute(
                    `
                    DELETE FROM ponto_materiais
                    WHERE ponto_id = ?
                    `,
                    [id]
                );

                for (const materialId of ponto.materiais) {
                    await conexao.execute(
                        `
                        INSERT INTO ponto_materiais
                        (
                            ponto_id,
                            material_id
                        )
                        VALUES (?, ?)
                        `,
                        [id, materialId]
                    );
                }
            }

            await conexao.commit();

            return result.affectedRows;
        } catch (erro) {
            await conexao.rollback();
            throw erro;
        } finally {
            conexao.release();
        }
    }

    async excluir(id) {
        const [result] = await db.execute(
            `
            DELETE FROM pontos_coleta
            WHERE id = ?
            `,
            [id]
        );

        return result.affectedRows;
    }
}

module.exports = new PontoModel();
