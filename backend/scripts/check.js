const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const raiz = path.resolve(__dirname, "..");
const ignorados = new Set(["node_modules"]);

function listarJavaScript(diretorio) {
    return fs.readdirSync(diretorio, { withFileTypes: true })
        .flatMap((item) => {
            if (ignorados.has(item.name)) {
                return [];
            }

            const caminho = path.join(diretorio, item.name);

            if (item.isDirectory()) {
                return listarJavaScript(caminho);
            }

            return item.isFile() && item.name.endsWith(".js")
                ? [caminho]
                : [];
        });
}

const arquivos = listarJavaScript(raiz);

for (const arquivo of arquivos) {
    const resultado = spawnSync(
        process.execPath,
        ["--check", arquivo],
        { stdio: "inherit" }
    );

    if (resultado.status !== 0) {
        process.exit(resultado.status || 1);
    }
}

console.log(`${arquivos.length} arquivos JavaScript validados.`);
