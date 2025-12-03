import { Knex } from 'knex';
const tableName = 'reports';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.integer('qlikStateId').nullable().alter();
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.integer('qlikStateId').notNullable().alter();
    });
}

