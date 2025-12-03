import { Knex } from 'knex';
import { commonColumns } from '../20200511074854-create-actions';
const tableName = 'customers';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.createTable(tableName, (table) => {
        table.string('id', 255).primary('id').notNullable();
        table.string('name', 255).notNullable();
        table.string('spaceId', 255).notNullable();
        table.string('tenantId', 255).notNullable();

        commonColumns(table, knex);
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.dropTableIfExists(tableName);
}
