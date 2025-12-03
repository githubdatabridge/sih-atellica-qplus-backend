import type { Knex } from 'knex';

const data = {
    array: [{
        authType: 'windows',
        name: 'local 1',
        customers: [
            {
                apps: [
                    {
                        callbackUrl:
                            'https://localhost:7005/qlik/dashboards/overview',
                        qlikApps: [
                            {
                                id: '05cf243f-8413-42a2-a173-7f6b94c8a08e',
                                name: 'compliments',
                            },
                            {
                                id: 'ac8fd1a5-8a29-432a-9126-d00dacddbaca',
                                name: 'audit',
                            },
                        ],
                        id: 'insight_poc',
                        name: 'insight_poc',
                    },
                ],
                id: 'SIH',
                name: 'customer 2',
            },
        ],
        id: 'SIHPOCWEB',
        host: 'qs-internal.databridge.ch',
        idProvider: null,
        port: 4242,
    }]
};

interface ITempTenant {
    id: number;
    data: any;
    createdAt: Date;
    updatedAt: Date;
}

const tableName = 'temp_tenants';
export async function up(knex: Knex): Promise<void> {
    var current = (await knex(tableName).where({ id: 1 }).first<ITempTenant>()) ;
    if (!current) {
        current = {
            id: 1,
            data: data,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await knex(tableName).insert(current);
        return;
    }

    current.data = data;
    current.updatedAt = new Date();
    await knex(tableName).where({ id: 1 }).update(current);
}

export async function down(knex: Knex): Promise<void> {
    await knex(tableName).where({ id: 1 }).delete();
}

