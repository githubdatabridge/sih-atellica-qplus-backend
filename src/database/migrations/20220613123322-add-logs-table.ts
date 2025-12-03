import { Knex } from 'knex';
import { commonColumns } from './20200511074854-create-actions';
const tableName = 'logs';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.createTable(tableName, (table) => {
        table.dateTime('timestamp', { useTz: false });
        table.string('level', 50).notNullable();
        table.string('message').notNullable();
        table.json('meta').nullable();
        table.string('service', 255).notNullable();
        commonColumns(table, knex);

        table.index(['timestamp', 'service'], 'index_timestamp_service');

        table.index(
            ['timestamp', 'level', 'service'],
            'index_timestamp_level_service'
        );

        table.index(['level', 'service'], 'index_level_service');
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.dropTableIfExists(tableName);
}
