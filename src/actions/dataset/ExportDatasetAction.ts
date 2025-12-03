import { autoInjectable } from 'tsyringe';
import { BaseAction } from '../BaseAction';
import { DatasetRepository, ReportRepository, TenantRepository } from '../../repositories';
import { FileModel } from '../../dtos';
import { QlikAuthData } from '../../lib/qlik-auth';
import { Errors } from '../../lib';

@autoInjectable()
export class ExportDatasetAction extends BaseAction<FileModel> {
    constructor(
        private readonly datasetRepository?: DatasetRepository,
        private readonly reportRepository?: ReportRepository,
        private readonly tenantRepository?: TenantRepository
    ) {
        super();
    }

    async run(userData: QlikAuthData): Promise<FileModel> {
        const response =
            await this.datasetRepository.GetDatasetsWithTemplateReports();

        const datasets = await this.datasetRepository.getAllWhere({});
        const data = [...response];

        datasets.forEach((ds) => {
            var exists = response.find((x) => x.id === ds.id);
            if (!exists) {
                data.push({ ...ds, reports: [] });
            }
        });

        const app = await this.getAppFromUserData(userData);

        const apps = {}
        app.qlikApps.forEach((x) => apps[x.name] = x.id);

        const result = {
            apps,
            datasets: data,
        };
        const file: FileModel = this.generateJsonFile(result);
        return file;
    }

    generateJsonFile = (
        response: any
    ): { data: Buffer; fileName: string; contentType: string } => {
        var json = JSON.stringify(response);
        var buffer = Buffer.from(json, 'utf-8');
        return {
            data: buffer,
            fileName: `datasets.json_${new Date().toISOString()}`,
            contentType: 'application/json',
        };
    };

    private async getAppFromUserData(userData: QlikAuthData) {
        const tenants = await this.tenantRepository.getAll();

        if (!tenants || tenants.length === 0 || !tenants[0]) {
            throw new Errors.InternalError('Tenant not found', {});
        }
        const tenant = tenants.find((x) => x.id === userData.tenantId);
        if (!tenant) {
            throw new Errors.InternalError('Tenant not found', {});
        }
        const customer = tenant.customers.find((x) => x.id === userData.customerId);
        if (!customer) {
            throw new Errors.InternalError('Customer not found', {});
        }

        const app = customer.apps.find((x) => x.id === userData.appId);

        if (!app) {
            throw new Errors.InternalError('App not found', {});
        }
        return app;
    }
}
