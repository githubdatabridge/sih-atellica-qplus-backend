import { Knex } from 'knex';
import { commonColumns } from './20200511074854-create-actions';
const tableName = 'pinwalls';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.createTable(tableName, (table) => {
        table.increments('id');

        table.string('title', 255).notNullable();
        table.string('appUserId', 255).notNullable();
        table.string('customerId', 255).notNullable();
        table.string('description').nullable();
        table.text('content').notNullable();

        commonColumns(table, knex);
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.dropTableIfExists(tableName);
}
