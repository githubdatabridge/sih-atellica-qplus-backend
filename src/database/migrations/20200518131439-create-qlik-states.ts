import { Knex } from 'knex';
import { commonColumns } from './20200511074854-create-actions';
const tableName = 'qlik_states';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.createTable(tableName, (table) => {
        table.increments('id');

        table.string('qsBookmarkId', 255).nullable();
        table.integer('qsSelectionHash').nullable();

        commonColumns(table, knex);
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.dropTableIfExists(tableName);
}
