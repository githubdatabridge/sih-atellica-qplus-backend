import { Knex } from 'knex';
const tableName = 'bookmarks';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable(tableName, (table) => {
        table.boolean('isPublic').notNullable().defaultTo(false);
        table.index(
            ['tenantId', 'customerId', 'appId'],
            'tenantId_customerId_appId'
        );
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable(tableName, (table) => {
        table.dropIndex(
            ['tenantId', 'customerId', 'appId'],
            'tenantId_customerId_appId'
        );
        table.dropColumn('isPublic');
    });
}
