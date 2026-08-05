const db = require("../config/database");

class TipoPontoModel {
    async listar() {
        const [rows] = await db.execute(`
            SELECT id, nome
            FROM tipos_ponto
            WHERE UPPER(nome) <> 'ECOPONTO'
            ORDER BY nome
        `);

        return rows;
    }
}

module.exports = new TipoPontoModel();
