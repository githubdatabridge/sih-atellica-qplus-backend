import { Knex } from 'knex';
const tableName = 'app_user_preferences';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.dropUnique(
            ['appUserId', 'customerId'],
            'index_unique_userId_customerId'
        );
        table.renameColumn('userId', 'appUserId');
        table.unique(
            ['appUserId', 'customerId'],
            'index_unique_appUserId_customerId'
        );
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.renameColumn('appUserId', 'userId');
        table.dropUnique(
            ['appUserId', 'customerId'],
            'index_unique_appUserId_customerId'
        );
        table.unique(
            ['appUserId', 'customerId'],
            'index_unique_userId_customerId'
        );
    });
}
