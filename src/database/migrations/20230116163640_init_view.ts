import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createViewOrReplace('followers_view', (view) => {
        view.columns(['r_appUserId', 'u_appUserId']);
        view.as(
            knex('reports')
                .select(
                    'r.appUserId as r_appUserId',
                    'u.appUserId as u_appUserId',
                    'u.deletedAt'
                )
                .distinct()
                .from({ r: 'reports' })
                .leftJoin({ u: 'users_reports' }, 'u.reportId', 'r.id')
                .where({
                    'r.deletedAt': null,
                })
        );
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropView('followers_view');
}

