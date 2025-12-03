import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return await knex.schema
        .alterTable('visualizations', (table) => {
            table.string('customerId').defaultTo('').nullable();
        })
        .alterTable('actions', (table) => {
            table.string('customerId').defaultTo('').nullable();
        })
        .alterTable('datasets', (table) => {
            table.string('customerId').defaultTo('').nullable();
        });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema
        .alterTable('visualizations', (table) => {
            table.dropColumn('customerId');
        })
        .alterTable('actions', (table) => {
            table.dropColumn('customerId');
        })
        .alterTable('datasets', (table) => {
            table.dropColumn('customerId');
        });
}

