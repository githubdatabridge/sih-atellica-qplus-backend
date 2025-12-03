import { Knex } from 'knex';
const tableName = 'actions';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createSchemaIfNotExists(knex.client.config.searchPath);
    await knex.schema.createTable(tableName, (table) => {
        table.increments('id');
        table.string('appUserId', 255).notNullable();
        table.integer('commentId').notNullable();
        table.timestamp('viewedAt').nullable();
        commonColumns(table, knex);
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.dropTableIfExists(tableName);
}

export async function commonColumns(table: Knex.CreateTableBuilder,knex: Knex) {
    table
        .timestamp('createdAt', { useTz: false })
        .defaultTo(knex.fn.now())
        .notNullable();
    table
        .timestamp('updatedAt', { useTz: false })
        .defaultTo(knex.fn.now())
        .notNullable();
    table.timestamp('deletedAt', { useTz: false }).nullable();
}

