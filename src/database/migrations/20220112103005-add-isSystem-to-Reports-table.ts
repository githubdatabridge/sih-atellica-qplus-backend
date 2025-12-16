import { Knex } from 'knex';
const tableName = 'reports';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable(tableName, (table) => {
        ////ADDING isSystem ////
        table.boolean('isSystem').notNullable().defaultTo(false);
    });

    await knex
        .table(tableName)
        .update({ appUserId: 'SYSTEM_V1', isSystem: true })
        .whereNull('appUserId');

    ////CHANGING appUserId TO NOT ALLOW NULL ////
    await knex.schema.alterTable(tableName, (table) => {
        table.string('appUserId').notNullable().defaultTo('SYSTEM_V1').alter();
    });
}

export async function down(knex: Knex): Promise<void> {
    ////CHANGING appUserId TO ALLOW NULL ////
    await knex.schema.alterTable(tableName, (table) => {
        table.string('appUserId').nullable().alter();
    });

    ////CHANGING BACK TO PREVIEWS VALUES FOR appUserId ////
    await knex
        .table('reports')
        .where({ isSystem: true })
        .update({ appUserId: null });

    ////REMOVING isSystem ////
    await knex.schema.alterTable(tableName, (table) => {
        table.dropColumn('isSystem');
    });
}
