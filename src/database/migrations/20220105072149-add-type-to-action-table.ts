import { Knex } from 'knex';
const tableName = 'actions';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.string('type', 255).notNullable().defaultTo('NONE');
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.dropColumn('type');
    });
}
