import { Knex } from 'knex';
const tableName = 'reactions';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.integer('visualizationId').nullable().alter();
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.integer('visualizationId').notNullable().alter();
    });
}
