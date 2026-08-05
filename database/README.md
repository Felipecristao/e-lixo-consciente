## Inicializacao do banco

Com Docker, `schema.sql` e `seed.prod.sql` são executados automaticamente na
primeira criação do volume do MariaDB.

Para uma instalação manual, abra o cliente MariaDB a partir desta pasta e
execute:

```sql
SOURCE schema.sql;
SOURCE seed.prod.sql;
```

As migrations são destinadas somente a bancos antigos que ainda não possuem
as colunas já incorporadas ao `schema.sql`. Execute-as em ordem numérica.

O seed não cria usuários ou credenciais padrão.
