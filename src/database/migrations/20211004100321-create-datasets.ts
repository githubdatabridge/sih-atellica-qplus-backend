import { Knex } from 'knex';
import { commonColumns } from './20200511074854-create-actions';
const tableName = 'datasets';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.createTable(tableName, (table) => {
        table.increments('id');

        table.string('appUserId', 255).nullable();
        table.string('qlikId', 255).notNullable();
        table.string('title', 255).notNullable();
        table.text('description').nullable();
        table.string('label', 255).nullable();
        table.string('type', 255).notNullable();
        table.text('tags').nullable();
        table.string('color', 255).nullable();

        commonColumns(table, knex);
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.dropTableIfExists(tableName);
}
