import { Knex } from 'knex';
const tableName = 'datasets';

export async function up(knex: Knex): Promise<void> {
    ///CHANGING VALUES FOR qlikId from null to NONE ////
    await knex.table(tableName).update({ qlikId: 'NONE' }).whereNull('qlikId');

    await knex.schema.alterTable(tableName, (table) => {
        table.string('qlikId').notNullable().defaultTo('NONE').alter();
        table.renameColumn('qlikId', 'qlikAppId');
    });
}

export async function down(knex: Knex): Promise<void> {
    ////CHANGING VALUES FOR qlikId from NONE to null ////
    await knex.schema.alterTable(tableName, (table) => {
        table.string('qlikAppId').nullable().alter();
        table.renameColumn('qlikAppId', 'qlikId');
    });

    await knex
        .table(tableName)
        .update({ qlikId: null })
        .where({ qlikId: 'NONE' });
}
