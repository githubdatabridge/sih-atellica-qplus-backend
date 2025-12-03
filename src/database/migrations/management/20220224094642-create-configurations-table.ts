import { Knex } from 'knex';
import { commonColumns } from '../20200511074854-create-actions';
const tableName = 'configurations';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.createTable(tableName, (table) => {
        table.string('id').primary('id').notNullable();
        table.string('clientId', 255).nullable();
        table.string('clientSecret', 255).nullable();
        table.string('tenantId', 255).nullable();
        table.string('qlikTenantId', 255).nullable();
        table.string('keyid', 255).nullable();
        table.string('apiKeyId', 255).nullable();

        table.integer('qpsPort').nullable();
        table.integer('qrsPort').nullable();
        table.integer('qixPort').nullable();

        commonColumns(table, knex);
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.dropTableIfExists(tableName);
}
