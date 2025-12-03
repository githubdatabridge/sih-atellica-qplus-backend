import { Knex } from 'knex';
import { commonColumns } from './20200511074854-create-actions';
const tableName = 'bookmarks';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.createTable(tableName, (table) => {
        table.increments('id');

        table.string('name').notNullable().defaultTo('Name');
        table.string('appUserId', 255).notNullable();
        table.string('tenantId', 255).notNullable();
        table.string('appId', 255).notNullable();
        table.string('customerId', 255).notNullable();
        table.integer('qlikStateId').notNullable();

        commonColumns(table, knex);
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.dropTableIfExists(tableName);
}
