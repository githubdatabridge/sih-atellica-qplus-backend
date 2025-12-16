import 'reflect-metadata';

import * as Hapi from '@hapi/hapi';
import * as Inert from '@hapi/inert';
import * as Bell from '@hapi/bell';
import * as Vision from '@hapi/vision';
import * as HapiSwagger from 'hapi-swagger';
import * as DevErrors from 'hapi-dev-errors';
import * as services from './services';
import * as repositories from './repositories';
import * as controllers from './controllers';
import { container } from 'tsyringe';
import { getServerCertificates } from './server-certificates';
import { QlikCookie } from './lib/plugins/QlikCookie';
import { QlikMultiIdp } from './lib/plugins/QlikMultiIdp';
import { QlikJwt } from './lib/plugins/QlikJwt';

const configService = container.resolve(services.ConfigService);
const socketService = container.resolve(services.SocketService);
const logService = container.resolve(services.LogService);
const tenantRepository = container.resolve(repositories.TenantRepository);
const cache = container.resolve(services.QlikUserCacheService);
const knexService = container.resolve(services.KnexService);

let gateway = {};

if (configService.get('GATEWAY_HOST') && configService.get('GATEWAY_PATH')) {
    gateway = {
        host: configService.get('GATEWAY_HOST'),
        basePath: configService.get('GATEWAY_PATH'),
    };

    logService
        .get()
        .info(
            `Setting up Swagger gateway ${gateway['host']}${gateway['basePath']}`
        );
}

const swaggerConfig: HapiSwagger.RegisterOptions = {
    info: {
        title: configService.get('TITLE'),
        version: configService.get('VERSION'),
    },
    ...gateway,
};
const setupLogs = (server: Hapi.Server) => {
    server.events.on('response', (request) => {
        logService
            .get()
            .debug(
                `Response Request ${
                    request.info.remoteAddress
                }: ${request.method.toUpperCase()}  ${request.path}  ${
                    request.info.hostname
                }`
            );
    });

    server.ext('onRequest', (request, reply) => {
        logService
            .get()
            .debug(
                `Request ${
                    request.info.remoteAddress
                }: ${request.method.toUpperCase()}  ${request.path}  ${
                    request.info.hostname
                }`
            );
        return reply.continue;
    });
};

const setupServerPlugins = async (server: Hapi.Server) => {
    await server.register({
        plugin: DevErrors,
        options: {
            showErrors: process.env.NODE_ENV !== 'production',
        },
    });

    await server.register([
        Inert,
        Vision,
        Bell,
        QlikMultiIdp,
        QlikCookie,
        QlikJwt,
    ]);
    await server.register({
        plugin: HapiSwagger,
        options: swaggerConfig,
    });
};

const setupControllers = (server: Hapi.Server) => {
    const pingController = new controllers.PingController();
    const authController = new controllers.AuthController();
    const appUserPreferencesController =
        new controllers.AppUserPreferencesController();
    const feedbackController = new controllers.FeedbackController();
    const pinwallController = new controllers.PinWallController();
    const actionController = new controllers.ActionController();
    const commentController = new controllers.CommentController();
    const reactionController = new controllers.ReactionController();
    const visualizationController = new controllers.VisualizationController();
    const reportController = new controllers.ReportController();
    const datasetController = new controllers.DatasetController();
    const userController = new controllers.UserController();
    const oAuthController = new controllers.QlikController();
    const bookmarkController = new controllers.BookmarkController();

    server.route(pingController.routes());
    server.route(authController.routes());
    server.route(appUserPreferencesController.routes());
    server.route(feedbackController.routes());
    server.route(pinwallController.routes());
    server.route(actionController.routes());
    server.route(commentController.routes());
    server.route(reactionController.routes());
    server.route(visualizationController.routes());
    server.route(reportController.routes());
    server.route(datasetController.routes());
    server.route(userController.routes());
    server.route(oAuthController.routes());
    server.route(bookmarkController.routes());
};

const hostConfiguration = {
    host: configService.get('HOST'),
    port: parseInt(configService.get('PORT')),
};

const routeConfiguration = {
    routes: {
        cors: {
            origin: ['*'],
            credentials: true,
            additionalHeaders: [
                'x-app-name',
                'x-vp',
                'x-app-admin',
                'x-tenant-id',
                'x-customer-id',
            ],
            exposedHeaders: ['Content-Disposition'],
        },
    },
};

const isSsl = configService.get('SSL', true);

const init = async () => {
    const cfg: Hapi.ServerOptions = isSsl
        ? {
              ...hostConfiguration,
              tls: {
                  key: getServerCertificates().key,
                  cert: getServerCertificates().cert,
              },
              ...routeConfiguration,
          }
        : {
              ...hostConfiguration,
              ...routeConfiguration,
          };

    if (process.env.NODE_ENV !== 'production') {
        cfg['debug'] = {
            request: ['error'],
        };
    }

    await knexService.initial();

    await tenantRepository.init();
    const server = new Hapi.Server(cfg);

    await setupServerPlugins(server);
    setupControllers(server);
    setupLogs(server);

    await cache.init('user-list', 60 * 1000);

    socketService.init(server.listener);

    await server.start();
    logService.get().info(`Server running on ${server.info.uri}`);

    process.on('SIGINT', (code) => {
        logService.get().info(`stopping server...`);
        server.stop().then(async () => {
            logService.get().info(`stopped server.`);
            await knexService.get().destroy();
            process.exit(0);
        });
    });

    process.on('SIGTERM', (signal) => {
        logService.get().info(`stopping server...`);
        server.stop().then(async () => {
            logService.get().info(`stopped server.`);
            await knexService.get().destroy();
            process.exit(0);
        });
    });

    process.on('unhandledRejection', (err) => {
        logService.get().error(`Unhandled Rejection ${err}`);
        logService.get().info(`stopping server...`);
        server.stop().then(async (err) => {
            logService.get().info(`stopped server.`);
            await knexService.get().destroy();
            process.exit(1);
        });
    });
};

init();
