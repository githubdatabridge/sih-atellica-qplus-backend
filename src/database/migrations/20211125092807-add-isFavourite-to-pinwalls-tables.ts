import { Knex } from 'knex';
const tableName = 'pinwalls';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.boolean('isFavourite').notNullable().defaultTo(false);
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(tableName, (table) => {
        table.dropColumn('isFavourite');
    });
}

