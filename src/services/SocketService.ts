import * as http from 'http';
import * as io from 'socket.io';
import { delay, inject, singleton } from 'tsyringe';
import { Notification, UserMetadata } from '../entities';
import { v4 as uuidv4 } from 'uuid';
import { ExtractCookieStateFromHeaders } from '../lib/util';
import { LogService, QlikAuthProviderFactory } from '.';
import { ClientBase } from '../entities';
import { Errors } from '../lib';
import { boomHandleError } from '../lib/errors';

interface Client extends ClientBase<io.Socket> {}
@singleton()
export class SocketService {
    private io: io.Server = null;
    private clients: Client[] = [];

    constructor(
        @inject(delay(() => LogService)) private logger?: LogService,
        @inject(delay(() => QlikAuthProviderFactory))
        private authProviderFactory?: QlikAuthProviderFactory
    ) {}

    init(server: http.Server) {
        if (this.io) {
            return;
        }
        this.logger.get().info('Starting Socket Server');

        this.io = new io.Server(server, {
            cors: { origin: '*' },
            allowEIO3: true,
        });

        this.io
            .use(AuthUser(this.logger, this.authProviderFactory))
            .on('connection', (socket: io.Socket) => {
                this.onConnection(socket);
            });

        this.logger.get().info('Socket Server Started');
    }

    private connectClient(
        userId: string,
        customerId: string,
        tenantId: string,
        appId: string,
        socket: io.Socket
    ): Client {
        const client = {
            userId,
            customerId,
            tenantId,
            appId,
            socket,
            uid: uuidv4(),
        };

        this.clients.push(client);

        return client;
    }

    private disconnectClient(client: Client) {
        const i = this.clients.findIndex((c) => c.uid === client.uid);

        if (i !== -1) {
            this.clients.splice(i, 1);
        }
    }

    public notifyAllUsersInCustomer(
        data: Notification,
        userIdToSkip?: string
    ): boolean {
        if (!this.io) {
            this.logger.get().warning('Socket Server not initialized');
            return false;
        }

        const users = this.clients.filter(
            (c) => compere(c, data) && c.userId !== userIdToSkip
        );

        if (!users || !users.length) {
            return false;
        }

        users.forEach((user) => {
            user.socket.emit('notification', data);
        });

        return true;
    }

    public notifyUser(data: Notification): boolean {
        if (!this.io) {
            this.logger.get().warning('Socket Server not initialized');
            return;
        }

        let users;

        if (Array.isArray(data.appUserIds)) {
            users = this.clients.filter(
                (u) => data.appUserIds.includes(u.userId) && compere(data, u)
            );
        }

        if (!users || !users.length) {
            return false;
        }

        users.forEach((user) => {
            user.socket.emit('notification', data);
        });

        return true;
    }

    private async onConnection(socket: io.Socket) {
        const client = this.connectClient(
            socket.handshake.headers.appUserID as string,
            socket.handshake.headers.customerId as string,
            socket.handshake.headers.tenantId as string,
            socket.handshake.headers.appId as string,
            socket
        );

        this.logger
            .get()
            .info(
                `SOCKET SERVER: Client Connected [${this.clients.length}] ${client.userId} ${client.customerId}`
            );

        this.logger.get().info(
            `SOCKET SERVER: Customer [${client.customerId}] Tenant [${
                client.tenantId
            }] App [${client.appId}] \n Connected Users: \n ${this.clients
                .filter((c) => compere(c, client))
                .map((x) => x.userId)
                .join('\n ')}`
        );

        socket.on('disconnect', () => {
            this.onConnectionClose(client);
        });
    }

    private onConnectionClose(client: Client) {
        this.logger
            .get()
            .info(
                `SOCKET SERVER: Client Disconnected ${client.userId} ${client.customerId}`
            );
        this.disconnectClient(client);
    }
}

function AuthUser(
    logger: LogService,
    providerFactory: QlikAuthProviderFactory
): (socket: io.Socket, fn: (err?: any) => void) => void {
    return async function (socket: io.Socket, next) {
        if (!socket.handshake.headers.cookie) {
            next(new Error('SOCKET SERVER: Authentication error'));
        }

        try {
            const headers = moveFromQueryToHeaders(
                socket.handshake.headers,
                socket.handshake.query
            );

            const state = ExtractCookieStateFromHeaders(headers);

            const tenantId = headers['x-tenant-id'];

            const provider = providerFactory.create(tenantId);
            const user = await provider.ensureQlikUser(state, headers);

            socket.handshake.headers['customerId'] = user.customerId;
            socket.handshake.headers['appUserID'] = user.user.appUserId;
            socket.handshake.headers['tenantId'] = user.tenantId;
            socket.handshake.headers['appId'] = user.appId;
            next();
        } catch (err) {
            socket.disconnect(true);
            logError(err, logger);
            next(new Error('SOCKET SERVER: Authentication Failed'));
        }
    };
}

function logError(err: any, logger: LogService) {
    if (err instanceof Errors.BaseError) {
        boomHandleError(err, false);
    } else {
        logger.get().error('SOCKET SERVER: Authentication Failed', err);
    }
}

function moveFromQueryToHeaders(headers: any, query: any) {
    const result = { ...headers };

    result['x-tenant-id'] = query['x-tenant-id'];
    result['x-customer-id'] = query['x-customer-id'];
    result['x-app-name'] = query['x-app-name'];
    result['x-vp'] = query['x-vp'];
    if (query['token']) {
        result['Authorization'] = `Bearer ${query['token']}`;
    }

    return result;
}

const compere = (obj1: UserMetadata, obj2: UserMetadata) => {
    return (
        obj1.customerId === obj2.customerId &&
        obj1.appId === obj2.appId &&
        obj1.tenantId === obj2.tenantId
    );
};
