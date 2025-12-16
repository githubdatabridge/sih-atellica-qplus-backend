import { Knex } from 'knex';
const tableName = 'datasets';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.text('dimensions').notNullable().defaultTo('[]');
        table.text('measures').notNullable().defaultTo('[]');
        table.text('filters').notNullable().defaultTo('[]');
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.dropColumn('dimensions');
        table.dropColumn('measures');
        table.dropColumn('filters');
    });
}
