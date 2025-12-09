import { Knex } from 'knex';
import { commonColumns } from './20200511074854-create-actions';
const tableName = 'tenants';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.createTable(tableName, (table) => {
        table.increments('id');
        table.json('data').notNullable();
        commonColumns(table, knex);
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.dropTableIfExists(tableName);
}
