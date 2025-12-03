import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { Report } from '../../entities';
import { QlikStateRepository } from '../../repositories';
import { ReportRepository } from '../../repositories/ReportRepository';
import { DatasetRepository } from '../../repositories/DatasetRepository';
import { Errors, SCOPE } from '../../lib';
import {
    KnexService,
    NotifyOnReportService,
    QlikStateService,
    ReportService,
} from '../../services';
import { checkIfUserIsAdmin, handleTextFields } from '../../lib/util';
import { QlikAuthData } from '../../lib/qlik-auth';
import { Transaction } from 'knex/lib';
import { DatasetService } from '../../services/DatasetService';

@injectable()
@autoInjectable()
export class CreateReportAction extends BaseAction<Report> {
    constructor(
        private reportRepository?: ReportRepository,
        private datasetRepository?: DatasetRepository,
        private qlikStateRepository?: QlikStateRepository,
        private qlikStateService?: QlikStateService,
        private reportService?: ReportService,
        private datasetService?: DatasetService,
        private notifyService?: NotifyOnReportService,
        private knexService?: KnexService
    ) {
        super();
    }

    async run(data: Report, userData: QlikAuthData): Promise<Report> {
        const isAdmin = checkIfUserIsAdmin(userData);

        data.isSystem = isAdmin;
        data.templateId = null;
        data.appUserId = userData.user.appUserId;
        data.customerId = userData.customerId;
        data.tenantId = userData.tenantId;
        data.appId = userData.appId;

        data.content = handleTextFields(data.content);

        if (data.isFavourite === true && data.isSystem) {
            throw new Errors.ValidationError(
                'System report can not change isFavourite',
                {
                    method: 'CreateReport',
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    appUserId: data.appUserId,
                    isAdmin: isAdmin,
                }
            );
        }

        const trx = (await this.knexService.transaction()) as Transaction;
        try {
            const dataset = await this.datasetRepository.findByID(
                data.datasetId
            );

            if (
                !dataset ||
                dataset.customerId !== userData.customerId ||
                dataset.tenantId !== userData.tenantId ||
                dataset.appId !== userData.appId
            ) {
                throw new Errors.NotFoundError('Dataset not found.', {
                    method: 'CreateReport',
                    reportId: data.id,
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    appUserId: data.appUserId,
                });
            }

            var visualizations = JSON.parse(dataset.visualizations) as {
                name: string;
            }[];
            if (
                !visualizations.some((x) => x.name === data.visualizationType)
            ) {
                throw new Errors.ValidationError(
                    'VisualizationType not found in Dataset.',
                    {
                        method: 'CreateReport',
                        reportId: data.id,
                        customerId: userData.customerId,
                        tenantId: userData.tenantId,
                        appId: userData.appId,
                        appUserId: data.appUserId,
                        visualizationType: data.visualizationType,
                        inDatasets: visualizations.map((x) => x.name).join(';'),
                    }
                );
            }

            let qlikState = data.qlikState;
            if (qlikState) {
                const newQlikState =
                    this.qlikStateService.handleTextFields(qlikState);

                qlikState = await this.qlikStateRepository.create(
                    newQlikState,
                    trx
                );

                if (!qlikState) {
                    throw new Errors.InternalError(
                        'QlikState creation failed',
                        {
                            method: 'CreateReport',
                            reportId: data.id,
                            customerId: userData.customerId,
                            tenantId: userData.tenantId,
                            appId: userData.appId,
                            appUserId: data.appUserId,
                        }
                    );
                }
            }

            data.datasetId = dataset.id;
            data.qlikStateId = qlikState ? qlikState.id : null;

            delete data.dataset;
            delete data.qlikState;

            let result = await this.reportRepository.create(data, trx);
            if (!result) {
                throw new Errors.InternalError('Report creation failed', {
                    method: 'CreateReport',
                    reportId: data.id,
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    appUserId: data.appUserId,
                });
            }

            if (checkIfUserIsAdmin(userData, [SCOPE.DS_WRITE])) {
                await this.reportRepository.update(
                    result.id,
                    { templateId: result.id },
                    true,
                    trx
                );
            }

            await trx.commit();

            result.dataset = dataset;
            result.qlikState = qlikState;

            const sharedReportIds =
                await this.reportService.GetSharedByAppUserIds(
                    userData.user.appUserId
                );

            result = this.reportService.setSystemAndSharingMetadata(
                result,
                sharedReportIds
            );

            if (!result.isSystem) {
                result.sharedWithOthers = false;
            }

            result = this.reportService.checkIsPinwallableAllowed(result);

            if (result.isSystem) {
                await this.notifyService.NotifyWhenSystemReportCreated(
                    userData,
                    result
                );
            }

            result.user = userData.user;
            result.dataset.qlikApp = this.datasetService.getQlikApp(
                result.dataset.qlikAppId,
                userData
            );
            return result;
        } catch (error) {
            await trx.rollback(new Error('Condition caused rollback!'));
            throw error;
        }
    }
}
