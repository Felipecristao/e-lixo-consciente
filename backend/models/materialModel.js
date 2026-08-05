const db = require("../config/database");

class MaterialModel {

    async listar() {

        const [rows] = await db.execute(`
            SELECT
                id,
                nome
            FROM materiais
            ORDER BY nome
        `);

        return rows;

    }

}

module.exports = new MaterialModel();