const db = require("../config/database");

class AdminModel {

    async buscarResumo() {
        const [[resumoPontos]] = await db.execute(`
            SELECT
                SUM(status = 'PENDENTE') AS pendentes,
                SUM(status = 'APROVADO') AS aprovados,
                SUM(status = 'REJEITADO') AS rejeitados
            FROM pontos_coleta
        `);

        const [[resumoUsuarios]] = await db.execute(`
            SELECT COUNT(*) AS usuarios
            FROM usuarios
        `);

        return {
            pendentes: Number(
                resumoPontos.pendentes || 0
            ),

            aprovados: Number(
                resumoPontos.aprovados || 0
            ),

            rejeitados: Number(
                resumoPontos.rejeitados || 0
            ),

            usuarios: Number(
                resumoUsuarios.usuarios || 0
            )
        };
    }

    async listarPontos() {
        const [rows] = await db.execute(`
            SELECT
                p.id,
                p.nome,
                p.cidade,
                p.status,
                p.exclusao_status,
                p.exclusao_solicitada_em,
                p.criado_em AS data_cadastro,

                tp.nome AS tipo,

                u.nome AS usuario

            FROM pontos_coleta p

            LEFT JOIN tipos_ponto tp
                ON tp.id = p.tipo_ponto_id

            LEFT JOIN usuarios u
                ON u.id = p.usuario_id

            ORDER BY
                FIELD(
                    p.status,
                    'PENDENTE',
                    'REJEITADO',
                    'APROVADO'
                ),
                p.criado_em DESC
        `);

        return rows;
    }

    async buscarPontoPorId(id) {
        const [rows] = await db.execute(
            `
            SELECT
                p.id,
                p.nome,
                p.descricao,

                p.tipo_ponto_id,
                tp.nome AS tipo,

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
                p.motivo_rejeicao,
                p.aprovado_em,
                p.exclusao_status,
                p.exclusao_motivo,
                p.exclusao_solicitada_em,

                p.usuario_id,
                u.nome AS usuario,
                u.email AS usuario_email,

                p.criado_em AS data_cadastro,
                p.atualizado_em

            FROM pontos_coleta p

            LEFT JOIN tipos_ponto tp
                ON tp.id = p.tipo_ponto_id

            LEFT JOIN usuarios u
                ON u.id = p.usuario_id

            WHERE p.id = ?

            LIMIT 1
            `,
            [id]
        );

        if (!rows.length) {
            return null;
        }

        const ponto = rows[0];

        ponto.materiais =
            await this.listarMateriaisDoPonto(id);

        return ponto;
    }

    async listarMateriaisDoPonto(pontoId) {
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

    async aprovar(id) {
        const [resultado] = await db.execute(
            `
            UPDATE pontos_coleta

            SET
                status = 'APROVADO',
                aprovado_em = NOW(),
                motivo_rejeicao = NULL

            WHERE id = ?
            `,
            [id]
        );

        return resultado.affectedRows;
    }

    async rejeitar(id, motivo) {
        const [resultado] = await db.execute(
            `
            UPDATE pontos_coleta

            SET
                status = 'REJEITADO',
                motivo_rejeicao = ?,
                aprovado_em = NULL

            WHERE id = ?
            `,
            [motivo, id]
        );

        return resultado.affectedRows;
    }

    async aprovarExclusao(id) {
        const [resultado] = await db.execute(
            `
            DELETE FROM pontos_coleta
            WHERE id = ?
              AND exclusao_status = 'PENDENTE'
            `,
            [id]
        );

        return resultado.affectedRows;
    }

    async rejeitarExclusao(id) {
        const [resultado] = await db.execute(
            `
            UPDATE pontos_coleta
            SET
                exclusao_status = 'NENHUMA',
                exclusao_motivo = NULL,
                exclusao_solicitada_em = NULL
            WHERE id = ?
              AND exclusao_status = 'PENDENTE'
            `,
            [id]
        );

        return resultado.affectedRows;
    }
}

module.exports = new AdminModel();
