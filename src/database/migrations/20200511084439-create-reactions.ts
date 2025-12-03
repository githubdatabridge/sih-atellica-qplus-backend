import { Knex } from 'knex';
import { commonColumns } from './20200511074854-create-actions';
const tableName = 'reactions';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.createTable(tableName, (table) => {
        table.increments('id');
        table.integer('score').notNullable();
        table.string('scope', 255).nullable();
        table.string('appUserId', 255).notNullable();
        table.string('customerId', 255).notNullable();
        table.integer('qlikStateId').nullable();
        table.integer('commentId').nullable();
        table.integer('visualizationId').notNullable();
        commonColumns(table, knex);
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.dropTableIfExists(tableName);
}
