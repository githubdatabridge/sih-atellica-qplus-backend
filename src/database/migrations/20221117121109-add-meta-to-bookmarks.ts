import { Knex } from 'knex';
const tableName = 'bookmarks';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable(tableName, (table) => {
        table.jsonb('meta').nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable(tableName, (table) => {
        table.dropColumn('meta');
    });
}
