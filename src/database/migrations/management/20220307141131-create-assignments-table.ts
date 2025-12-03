import { Knex } from 'knex';
import { commonColumns } from '../20200511074854-create-actions';
const tableName = 'assignments';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.createTable(tableName, (table) => {
        table.string('id', 255).primary('id').notNullable();
        table.string('projectId', 255).notNullable();
        table.string('customerId', 255).notNullable();

        commonColumns(table, knex);
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.dropTableIfExists(tableName);
}
