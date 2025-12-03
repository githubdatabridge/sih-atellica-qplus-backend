import type { Knex } from "knex";
const tableNames = [
    'actions',
    'comments',
    'reactions',
    'visualizations',
    'qlik_states',
    "app_user_preferences",
    'feedbacks',
    "pinwalls",
    'pinwall_qlik_states',
    'datasets',
    'reports',
    'users_reports',
    'logs',
    'temp_tenants',
    'bookmarks',
    'bookmark_items',
    'users_bookmarks'
];


export async function up(knex: Knex): Promise<void> {
    for (const tableName of tableNames) {
        await knex.schema.alterTable(tableName, (table) => {
            table
                .timestamp('createdAt', { useTz: false })
                .defaultTo(knex.fn.now())
                .notNullable()
                .alter();
            table
                .timestamp('updatedAt', { useTz: false })
                .defaultTo(knex.fn.now())
                .notNullable()
                .alter();
        });
    }
}


export async function down(knex: Knex): Promise<void> {
    // no need to revert this migration because it's a fix
}

