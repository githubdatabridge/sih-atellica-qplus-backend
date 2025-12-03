import { Knex } from 'knex';
import { commonColumns } from './20200511074854-create-actions';
const tableName = 'bookmark_items';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('bookmarks', (table) => {
        table.dropColumn('qlikStateId');
    });
    await knex.schema.createTable(tableName, (table) => {
        table.increments('id');

        table.string('qlikAppId').notNullable();
        table.integer('qlikStateId').notNullable();
        table.integer('bookmarkId').notNullable();

        commonColumns(table, knex);

        table.unique(
            ['qlikAppId', 'qlikStateId'],
            'index_unique_qlikAppId_qlikStateId'
        );
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('bookmarks', (table) => {
        table.integer('qlikStateId').notNullable();
    });
    return await knex.schema.dropTableIfExists(tableName);
}
