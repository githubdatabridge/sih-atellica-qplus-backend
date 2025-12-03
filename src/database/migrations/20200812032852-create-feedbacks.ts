import { Knex } from 'knex';
import { commonColumns } from './20200511074854-create-actions';
const tableName = 'feedbacks';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.createTable(tableName, (table) => {
        table.increments('id');

        table.string('customerId', 255).notNullable();
        table.string('appUserId', 255).notNullable();
        table.integer('rating').notNullable();
        table.text('comment').nullable();

        commonColumns(table, knex);
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.dropTableIfExists(tableName);
}
