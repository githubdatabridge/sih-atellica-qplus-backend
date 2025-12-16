import { Knex } from 'knex';
const tableName = 'datasets';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.string('qlikId').nullable().alter();
        table.string('type').nullable().alter();
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.string('qlikId').notNullable().defaultTo('').alter();
        table.string('type').notNullable().defaultTo('').alter();
    });
}
