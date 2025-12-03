import { Knex } from 'knex';
import { commonColumns } from './20200511074854-create-actions';
const tableName = 'visualizations';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.createTable(tableName, (table) => {
        table.increments('id');

        table.string('appId', 255).notNullable();
        table.string('pageId', 255).notNullable();
        table.string('componentId', 255).nullable();

        commonColumns(table, knex);
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.dropTableIfExists(tableName);
}
