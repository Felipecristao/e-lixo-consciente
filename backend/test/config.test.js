const test = require("node:test");
const assert = require("node:assert/strict");

const { validarConfiguracao } = require("../server");

const chaves = [
    "NODE_ENV",
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "JWT_SECRET"
];

function preservarAmbiente() {
    return Object.fromEntries(
        chaves.map((chave) => [chave, process.env[chave]])
    );
}

function restaurarAmbiente(original) {
    for (const chave of chaves) {
        if (original[chave] === undefined) {
            delete process.env[chave];
        } else {
            process.env[chave] = original[chave];
        }
    }
}

test("aceita uma configuracao completa de desenvolvimento", () => {
    const original = preservarAmbiente();

    try {
        Object.assign(process.env, {
            NODE_ENV: "development",
            DB_HOST: "127.0.0.1",
            DB_PORT: "3306",
            DB_USER: "elixo",
            DB_PASSWORD: "segredo",
            DB_NAME: "elixo",
            JWT_SECRET: "segredo-local"
        });

        assert.doesNotThrow(validarConfiguracao);
    } finally {
        restaurarAmbiente(original);
    }
});

test("rejeita variavel obrigatoria ausente", () => {
    const original = preservarAmbiente();

    try {
        delete process.env.DB_HOST;
        assert.throws(validarConfiguracao, /DB_HOST/);
    } finally {
        restaurarAmbiente(original);
    }
});

test("exige JWT forte em producao", () => {
    const original = preservarAmbiente();

    try {
        Object.assign(process.env, {
            NODE_ENV: "production",
            DB_HOST: "db",
            DB_PORT: "3306",
            DB_USER: "elixo",
            DB_PASSWORD: "segredo",
            DB_NAME: "elixo",
            JWT_SECRET: "curto"
        });

        assert.throws(validarConfiguracao, /32 caracteres/);
    } finally {
        restaurarAmbiente(original);
    }
});
