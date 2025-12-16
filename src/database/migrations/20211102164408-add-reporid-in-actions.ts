import { Knex } from 'knex';
const tableName = 'actions';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.integer('reportId').nullable();
        table.integer('commentId').nullable().alter();
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.dropColumn('reportId');
        table.integer('commentId').notNullable().alter();
    });
}
