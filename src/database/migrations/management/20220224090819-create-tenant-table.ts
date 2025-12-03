import { Knex } from 'knex';
import { commonColumns } from '../20200511074854-create-actions';
const tableName = 'tenants';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.createTable(tableName, (table) => {
        table.uuid('id').primary('id').notNullable();
        table.string('ownerId', 255).notNullable();
        table.string('name').notNullable();
        table.string('domain').notNullable();
        table.integer('port').nullable();
        table.string('type').notNullable();
        table.string('preferenceId', 255).nullable();
        table.string('configurationId', 255).nullable();
        table.boolean('verified').notNullable().defaultTo(false);
        commonColumns(table, knex);
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.dropTableIfExists(tableName);
}
