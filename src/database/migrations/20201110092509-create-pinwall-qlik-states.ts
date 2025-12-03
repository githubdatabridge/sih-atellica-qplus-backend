import { Knex } from 'knex';
import { commonColumns } from './20200511074854-create-actions';
const tableName = 'pinwall_qlik_states';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.createTable(tableName, (table) => {
        table.increments('id');

        table.integer('pinwallId').notNullable();
        table.integer('qlikStateId').notNullable();

        commonColumns(table, knex);
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.dropTableIfExists(tableName);
}
