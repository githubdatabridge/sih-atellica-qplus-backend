import { Knex } from 'knex';
import { commonColumns } from '../20200511074854-create-actions';
const tableName = 'apiKeys';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.createTable(tableName, (table) => {
        table.string('id').primary('id').notNullable();
        table.string('value').notNullable();
        table.timestamp('expiry', { useTz: false }).notNullable();
        table.boolean('autoUpdate').notNullable().defaultTo(false);

        commonColumns(table, knex);
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.dropTableIfExists(tableName);
}
