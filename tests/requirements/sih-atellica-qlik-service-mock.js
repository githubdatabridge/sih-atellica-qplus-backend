'use strict';

const Hapi = require('@hapi/hapi');
const users = ['user1', 'user2', 'admin'];
const qsAppGuid = 'qplus';

const init = async () => {
    const server = Hapi.server({
        port: process.env['PORT'] ? process.env['PORT'] : 3333,
        host: process.env['HOST'] ? process.env['HOST'] : 'localhost',
    });

    server.route({
        method: 'POST',
        path: '/app/filter',
        handler: (request, h) => {
            console.log('request on /app/filter');
            return [qsAppGuid];
        },
    });
    server.route({
        method: 'POST',
        path: '/user/{user}',
        handler: (request, h) => {
            var user = request.params.user;

            if (!users.includes(user)) {
                return h
                    .response({ message: 'Invalid test user: ' + user })
                    .state(401);
            }

            console.log('request on /user/' + user);

            var result = {
                id: `${user}_id`,
                userId: `${user}_userId`,
                userDirectory: `${user}_userDirectory`,
                name: `${user}`,
                customProperties: [
                    {
                        key: 'roles',
                        name: 'qplus_role',
                        values: ['user'],
                    },
                    {
                        key: 'scopes',
                        name: 'qplus_scopes',
                        values: ['user:default', 'datasets:read'],
                    },
                ],
            };
            if (user.includes('admin')) {
                result.customProperties
                    .filter((x) => x.key === 'roles')[0]
                    .values.push('admin');

                result.customProperties
                    .filter((x) => x.key === 'scopes')[0]
                    .values.push('datasets:write');
            }

            return result;
        },
    });
    server.route({
        method: 'POST',
        path: `/user/list/${qsAppGuid}`,
        handler: (request, h) => {
            console.log(`request on /user/list/${qsAppGuid}`);
            return users.map((user) => {
                return {
                    id: `${user}_id`,
                    userId: `${user}_userId`,
                    userDirectory: `${user}_userDirectory`,
                    name: `${user}`,
                };
            });
        },
    });

    await server.start();
    console.log('sih-atellica-qlik-service-mock Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();
