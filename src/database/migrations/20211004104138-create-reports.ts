import { Knex } from 'knex';
import { commonColumns } from './20200511074854-create-actions';
const tableName = 'reports';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.createTable(tableName, (table) => {
        table.increments('id');

        table.text('content').notNullable();
        table.string('title', 255).notNullable();
        table.text('description').nullable();
        table.string('tenantId', 255).notNullable();
        table.string('appId', 255).notNullable();
        table.string('customerId', 255).notNullable();
        table.string('visualizationType', 255).notNullable();
        table.string('appUserId', 255).nullable();
        table.boolean('isPinwallable').notNullable().defaultTo(false);
        table.integer('datasetId').notNullable();
        table.integer('qlikStateId').notNullable();

        commonColumns(table, knex);
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.dropTableIfExists(tableName);
}
