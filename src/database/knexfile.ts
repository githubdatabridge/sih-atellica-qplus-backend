import { Knex } from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config();

interface IKnexConfig {
    [key: string]: Knex.Config;
}

const defaultEnv: Knex.Config = {
    client: 'pg',
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT),
        ssl: { rejectUnauthorized: false },
    },
    migrations: {
        directory: [path.resolve(__dirname, 'migrations')],
        tableName: 'knex_migrations',
        extension: 'ts',
        schemaName: process.env.DB_SCHEMA,
    },
    pool: {
        min: 2,
        max: 100,
    },
    acquireConnectionTimeout: 10000,
    searchPath: process.env.DB_SCHEMA,
};

const config: IKnexConfig = {
    develop: { ...defaultEnv, pool: { min: 2, max: 10 } },
    production: defaultEnv,
    staging: defaultEnv,
};

export default config;
