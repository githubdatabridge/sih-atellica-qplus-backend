import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { ChartType, Dataset } from '../../entities';
import { DatasetRepository } from '../../repositories/DatasetRepository';
import { Errors } from '../../lib';
import { checkIfUserIsAdmin } from '../../lib/util';
import { QlikAuthData } from '../../lib/qlik-auth';
import { DatasetService } from '../../services/DatasetService';

@injectable()
@autoInjectable()
export class CreateDatasetAction extends BaseAction<Dataset> {
    constructor(
        private datasetService?: DatasetService,
        private datasetRepository?: DatasetRepository
    ) {
        super();
    }

    async run(data: Dataset, userData: QlikAuthData): Promise<Dataset> {
        data.appUserId = userData.user.appUserId;

        if (!checkIfUserIsAdmin(userData)) {
            throw new Errors.Forbidden(
                'Dataset can be created only by User with Admin role.',
                {
                    method: 'CreateDataset',
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    appUserId: userData.user.appUserId,
                }
            );
        }

        const isTitleUnique = await this.datasetService.checkIsTitleUnique(
            data.title,
            userData
        );

        if (!isTitleUnique) {
            throw new Errors.AlreadyExistsError(
                `Dataset with title [${data.title}] already exists.`,
                {
                    method: 'CreateDataset',
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    appUserId: userData.user.appUserId,
                    title: data.title,
                }
            );
        }

        const qlikApp = this.datasetService.getQlikApp(
            data.qlikAppId,
            userData
        );

        if (!qlikApp) {
            throw new Errors.ValidationError('Invalid qlikAppId.', {
                method: 'CreateDataset',
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                appUserId: userData.user.appUserId,
                qlikAppId: data.qlikAppId,
            });
        }

        data = this.datasetService.handleTextFields(data);

        const visualizations = JSON.parse(data.visualizations) as ChartType[];

        const isVisualizationNameUnique =
            [...new Set(visualizations.map((x) => x.name))].length ===
            visualizations.length;

        if (!isVisualizationNameUnique) {
            throw new Errors.ValidationError('Visualization name not unique', {
                method: 'CreateDataset',
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                appUserId: userData.user.appUserId,
            });
        }

        data.customerId = userData.customerId;
        data.tenantId = userData.tenantId;
        data.appId = userData.appId;

        let result = await this.datasetRepository.create(data);

        if (!result) {
            throw new Errors.InternalError('Dataset creation failed', {
                method: 'CreateDataset',
                datasetId: data.id,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                appUserId: userData.user.appUserId,
            });
        }
        result = this.datasetService.handleTextFields(result);

        result.qlikApp = qlikApp;

        return result;
    }
}
