import { injectable } from 'tsyringe';
import { Dataset } from '../entities';
import { Errors } from '../lib';
import { QlikAuthData } from '../lib/qlik-auth';
import { handleTextFields } from '../lib/util';
import { DatasetRepository, TenantRepository } from '../repositories';

@injectable()
export class DatasetService {
    constructor(
        private tenantRepository?: TenantRepository,
        private datasetRepository?: DatasetRepository
    ) {}
    handleTextFields(data: Dataset) {
        data.tags = handleTextFields(data.tags);
        data.dimensions = handleTextFields(data.dimensions);
        data.measures = handleTextFields(data.measures);
        data.filters = handleTextFields(data.filters);
        data.visualizations = handleTextFields(data.visualizations);

        return data;
    }

    public async checkIsTitleUnique(
        title: string,
        userData: QlikAuthData,
        excludes: number[] = []
    ) {
        const result = await this.datasetRepository.getAll({
            title,
            appId: userData.appId,
            tenantId: userData.tenantId,
            customerId: userData.customerId,
        });

        if (!result || !result.data || !Array.isArray(result.data)) {
            throw new Errors.InternalError(
                'Failed to return Datasets from db.',
                {
                    method: 'DatasetService@checkIsTitleUnique',
                    title: title,
                    appId: userData.appId,
                    tenantId: userData.tenantId,
                    customerId: userData.customerId,
                }
            );
        }

        return !result.data.filter((x) => !excludes.includes(x.id))[0];
    }
    getQlikApp(qlikAppId: string, userData: QlikAuthData) {
        const tenant = this.tenantRepository
            .getAll()
            .find((x) => x.id === userData.tenantId);

        if (!tenant || !tenant.customers || tenant.customers.length == 0) {
            console.log(tenant);
            return;
        }

        const customer = tenant.customers.find(
            (x) => x.id === userData.customerId
        );

        if (!customer || !customer.apps || customer.apps.length == 0) {
            return;
        }

        const app = customer.apps.find((x) => x.id === userData.appId);

        if (!app || !app.qlikApps || app.qlikApps.length == 0) {
            return;
        }

        const QlikApp = app.qlikApps.find((x) => x.id === qlikAppId);

        return QlikApp;
    }
}
