import { Knex } from 'knex';
import { commonColumns } from './20200511074854-create-actions';
const tableName = 'app_user_preferences';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.createTable(tableName, (table) => {
        table.increments('id');

        table.boolean('chatbot').notNullable().defaultTo(false);
        table.boolean('forecast').notNullable().defaultTo(false);
        table.boolean('socialBar').notNullable().defaultTo(false);
        table.boolean('notifications').notNullable().defaultTo(false);
        table.string('themeMain').notNullable();
        table.string('language').notNullable();
        table.text('additionalPreferences').nullable();

        table.string('customerId').notNullable();
        table.string('userId').notNullable();

        commonColumns(table, knex);

        table.unique(
            ['userId', 'customerId'],
            'index_unique_userId_customerId'
        );
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.dropTableIfExists(tableName);
}
