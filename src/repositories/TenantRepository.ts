import { ConfigService, LogService, QlikAuthType } from '../services';
import { MashupApp, Tenant } from '../entities';
import { delay, inject, singleton } from 'tsyringe';
import * as fs from 'fs';
import { Errors } from '../lib';
import { TenantDataRepository } from './TenantDataRepository';

const RELOAD_INTERVAL = 5000;

@singleton()
export class TenantRepository {
    private tenants: Tenant[];
    private fileFullName: string;
    private fileName: string;
    private useFileOnly: boolean;
    constructor(
        private configService?: ConfigService,
        private tenantDataRepository?: TenantDataRepository,
        @inject(delay(() => LogService)) private logService?: LogService
    ) {
        const fileDirPath = configService.get('TENANT_FILE_PATH');
        const fileName = configService.get('TENANT_FILE_NAME');
        this.useFileOnly = configService.get('TENANT_FILE_ONLY', true);
        this.fileFullName = fileDirPath + fileName;
        this.fileName = fileName;
    }

    async init() {
        const fromDb = await this.tenantDataRepository.getAll();
        if (!fromDb || !fromDb.data || !fromDb.data[0] || this.useFileOnly) {
            try {
                const data = await fs.promises.readFile(
                    this.fileFullName,
                    'utf8'
                );
                this.tenants = JSON.parse(data);
                this.logService
                    .get()
                    .info(
                        `${this.fileName} loaded with ${this.tenants.length} tenants.`
                    );
            } catch (err) {
                this.logService
                    .get()
                    .error(`Failed to load ${this.fileName}.`, err);
                throw new Errors.InternalError(
                    'Failed to load tenants.json.',
                    err
                );
            }

            if (!this.useFileOnly) {
                const result = await this.tenantDataRepository.create({
                    id: 1,
                    data: { array: this.tenants },
                });

                this.tenants = result.data.array;
            }
        } else {
            this.tenants = fromDb.data[0].data.array;
            this.logService
                .get()
                .info(
                    `Tenants data loaded from db with ${this.tenants.length} tenants.`
                );
        }

        setInterval(async () => {
            await this.tryReloadTenants();
        }, RELOAD_INTERVAL);
    }

    getAll(): Tenant[] {
        return this.tenants;
    }

    getAppByAppId(
        tenantId: string,
        customerId: string,
        appId: string
    ): MashupApp {
        const tenant = this.getAll().find((x) => x.id === tenantId);
        if (!tenant || !tenant.customers || !tenant.customers[0]) {
            return;
        }

        const customer = tenant.customers.find((x) => x.id === customerId);
        if (!customer || !customer.apps || !customer.apps[0]) {
            return;
        }

        const app = customer.apps.find(
            (x) => x.id === appId || x.name === appId
        );
        if (!app) {
            return;
        }

        return app;
    }

    getSessionHeaders(authType: QlikAuthType): string[] {
        switch (authType) {
            case QlikAuthType.Windows:
                return ['X-Qlik-Session'];
            default:
                break;
        }
    }

    private async tryReloadTenants() {
        try {
            const data = await this.loadDataFromStore();
            if (this.checkForChanges(data, this.tenants)) {
                this.tenants = data;

                const loadType = this.useFileOnly ? 'file' : 'db';

                this.logService
                    .get()
                    .info(
                        `Tenants data reloaded from ${loadType} with ${this.tenants.length} tenants.`
                    );
            }
        } catch (error) {
            this.logService
                .get()
                .error(
                    `Tenants data failed to reloaded with error: ${error.message}.`
                );
        }
    }

    private checkForChanges = (data1: Tenant[], data2: Tenant[]) => {
        return JSON.stringify(data1) != JSON.stringify(data2);
    };

    private async loadDataFromStore() {
        let data: Tenant[];
        if (this.useFileOnly) {
            data = JSON.parse(
                await fs.promises.readFile(this.fileFullName, 'utf8')
            );
        } else {
            const fromDb = await this.tenantDataRepository.getAll();
            data = fromDb.data[0].data.array;
        }
        return data;
    }
}
