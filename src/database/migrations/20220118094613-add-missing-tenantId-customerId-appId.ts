import { Knex } from 'knex';

let tables = [
    'pinwalls',
    'comments',
    'reactions',
    'actions',
    'feedbacks',
    'app_user_preferences',
    'datasets',
    'users_reports',
];

export async function up(knex: Knex): Promise<void> {
    const tasks = [];
    tables.forEach((tableName) => {
        const task = knex.schema.alterTable(tableName, (table) => {
            table.string('tenantId').notNullable().defaultTo('');
            table.string('appId').notNullable().defaultTo('');
        });
        tasks.push(task);
    });
    await Promise.all(tasks);

    await knex.schema.alterTable('visualizations', (table) => {
        table.string('tenantId').notNullable().defaultTo('');
    });

    await knex.schema.alterTable('users_reports', (table) => {
        table.string('customerId').notNullable().defaultTo('');
    });

    await knex.schema.alterTable('app_user_preferences', (table) => {
        table.dropUnique(
            ['appUserId', 'customerId'],
            'index_unique_appUserId_customerId'
        );
        table.unique(
            ['appUserId', 'customerId', 'tenantId', 'appId'],
            'index_unique_appUserId_customerId_tenantId_appId'
        );
    });
}

export async function down(knex: Knex): Promise<void> {
    const tasks = [];
    tables.forEach((tableName) => {
        const task = knex.schema.alterTable(tableName, (table) => {
            table.dropColumn('tenantId');
            table.dropColumn('appId');
        });
        tasks.push(task);
    });
    await Promise.all(tasks);

    await knex.schema.alterTable('app_user_preferences', (table) => {
        table.unique(
            ['appUserId', 'customerId'],
            'index_unique_appUserId_customerId'
        );
    });

    await knex.schema.alterTable('visualizations', (table) => {
        table.dropColumn('tenantId');
    });

    await knex.schema.alterTable('users_reports', (table) => {
        table.dropColumn('customerId');
    });
}

