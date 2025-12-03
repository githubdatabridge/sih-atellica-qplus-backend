import { singleton } from 'tsyringe';
import knex, { Knex } from 'knex';
import { ConfigService, ENV_PARAMS } from './ConfigService';
import { attachPaginate } from 'knex-paginate';
import internal = require('stream');
import * as path from 'path';
import config from '../database/knexfile';

attachPaginate();

@singleton()
export class KnexService {
    private knex: Knex;
    private config: Knex.Config;
    private logLevel: number;

    constructor(private configService?: ConfigService) {}

    async initial(
        ensureCreateDatabase: boolean = true,
        migrate: boolean = true
    ) {
        this.config = config[process.env.NODE_ENV || 'develop'];
        this.logLevel = parseInt(this.configService.get(ENV_PARAMS.LOG_LEVEL));
        this.knex = knex({
            ...this.config,
            connection: {
                host: this.configService.get(ENV_PARAMS.DB_HOST),
                user: this.configService.get(ENV_PARAMS.DB_USER),
                port: parseInt(this.configService.get(ENV_PARAMS.DB_PORT)),
                password: this.configService.get(ENV_PARAMS.DB_PASS),
                database: this.configService.get(ENV_PARAMS.DB_DATABASE),
                ssl: this.configService.get(ENV_PARAMS.DB_SSL, true),
            },
            migrations: {
                ...this.config.migrations,
                schemaName: this.configService.get(ENV_PARAMS.DB_SCHEMA),
            },
            debug: this.logLevel > 1,
            searchPath: this.configService.get(ENV_PARAMS.DB_SCHEMA),
        });

        if (ensureCreateDatabase) {
            await this.ensureCreateDatabase();
            await this.knex.schema.createSchemaIfNotExists(
                this.configService.get('DB_SCHEMA')
            );
        }

        if (migrate) await this.knex.migrate.latest();
    }

    get() {
        if (!config) {
            throw new Error('Knex not initialized');
        } else {
            return this.knex;
        }
    }

    async transaction() {
        await this.releaseConnections();

        return new Promise((res) => {
            this.knex
                .transaction((trx) => {
                    res(trx);
                })
                .catch((e) => {});
        });
    }

    async releaseConnections() {
        if (this.logLevel > 1) {
            console.debug('Stats', [
                {
                    info: {
                        method: 'KnexService@releaseConnection',
                        numUsed: this.knex.client.pool.numUsed(),
                        numFree: this.knex.client.pool.numFree(),
                        numPendingAcquires:
                            this.knex.client.pool.numPendingAcquires(),
                        numPendingCreates:
                            this.knex.client.pool.numPendingCreates(),
                    },
                },
            ]);
        }
        for (const poolMember of this.knex.client.pool.used) {
            const result = this.knex.client.pool.validate(poolMember.resource);
            if (!result) {
                if (this.logLevel > 1) {
                    console.debug('Release', result);
                }
                await this.knex.client.releaseConnection(poolMember.resource);
            }
        }
    }

    // create database if not exists
    async ensureCreateDatabase() {
        const dbName = this.configService.get(ENV_PARAMS.DB_DATABASE);

        const config = {
            client: 'pg',
            connection: {
                host: this.configService.get(ENV_PARAMS.DB_HOST),
                user: this.configService.get(ENV_PARAMS.DB_USER),
                port: parseInt(this.configService.get(ENV_PARAMS.DB_PORT)),
                password: this.configService.get(ENV_PARAMS.DB_PASS),
                database: 'postgres',
                ssl: this.configService.get(ENV_PARAMS.DB_SSL, true),
            },
        };

        const k = knex(config);
        const dbExists = await k.raw(
            `SELECT 1 FROM pg_database WHERE datname = '${dbName}'`
        );
        if (dbExists.rows.length === 0) {
            await k.raw(`CREATE DATABASE "${dbName}"`);
        }

        await k.destroy();
    }
}
