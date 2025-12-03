import { Knex } from 'knex';
const tableName = 'qlik_states';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.json('selections').nullable();
        table.json('meta').nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.dropColumn('selections');
        table.dropColumn('meta');
    });
}
