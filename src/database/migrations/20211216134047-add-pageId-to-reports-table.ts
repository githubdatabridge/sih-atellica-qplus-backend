import { Knex } from 'knex';
const tableName = 'reports';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table
            .string('pageId', 255)
            .notNullable()
            .defaultTo('apps_dashboards_reporting');
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.dropColumn('pageId');
    });
}

