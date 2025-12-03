import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { QlikStateRepository, DatasetRepository } from '../../repositories';
import { Report } from '../../entities';
import { QlikAuthData } from '../../lib/qlik-auth';
import { ReportRepository } from '../../repositories';
import { Errors, SCOPE } from '../../lib';
import {
    KnexService,
    PinWallService,
    QlikStateService,
    ReportService,
    UserService,
} from '../../services';
import {
    AssignUser,
    checkIfUserIsAdmin,
    handleTextFields,
} from '../../lib/util';
import { Transaction } from 'knex/lib';
import { DatasetService } from '../../services/DatasetService';

@injectable()
@autoInjectable()
export class UpdateReportAction extends BaseAction<Report> {
    constructor(
        private reportRepository?: ReportRepository,
        private datasetRepository?: DatasetRepository,
        private qlikStateRepository?: QlikStateRepository,
        private qlikStateService?: QlikStateService,
        private datasetService?: DatasetService,
        private reportService?: ReportService,
        private knexService?: KnexService,
        private pinWallService?: PinWallService,
        private userService?: UserService
    ) {
        super();
    }

    async run(
        reportId: number,
        dataForUpdate: Report,
        userData: QlikAuthData
    ): Promise<Report> {
        const reportFromDb = await this.reportRepository.findByID(reportId, [
            'qlik_state',
            'dataset',
        ]);

        if (
            !reportFromDb ||
            userData.customerId !== reportFromDb.customerId ||
            userData.tenantId !== reportFromDb.tenantId ||
            userData.appId !== reportFromDb.appId
        ) {
            throw new Errors.NotFoundError('Report not found.', {
                method: 'CreateReport',
                reportId: reportId,
                customerId: dataForUpdate.customerId,
                tenantId: dataForUpdate.tenantId,
                appId: dataForUpdate.appId,
                appUserId: dataForUpdate.appUserId,
            });
        }

        dataForUpdate.content = handleTextFields(dataForUpdate.content);
        dataForUpdate.customerId = reportFromDb.customerId;
        dataForUpdate.tenantId = reportFromDb.tenantId;
        dataForUpdate.appId = reportFromDb.appId;
        dataForUpdate.appUserId = reportFromDb.appUserId;

        const isAdmin = checkIfUserIsAdmin(userData);

        const isUpdateAllowed =
            isAdmin || reportFromDb.appUserId === userData.user.appUserId;

        if (!isUpdateAllowed) {
            throw new Errors.NotFoundError('Not found', {
                method: 'UpdateReport',
                reportId: dataForUpdate.id,
                customerId: dataForUpdate.customerId,
                tenantId: dataForUpdate.tenantId,
                appId: dataForUpdate.appId,
                appUserId: dataForUpdate.appUserId,
                isAdmin: isAdmin,
            });
        }

        const isCustomerReport = !reportFromDb.templateId;
        const isSuperAdmin = checkIfUserIsAdmin(userData, [SCOPE.DS_WRITE]);

        if (!isCustomerReport && !isSuperAdmin) {
            throw new Errors.Forbidden('Insufficient scope.', {
                method: 'UpdateReport',
                id: reportFromDb.id,
                appUserId: userData.user.appUserId,
                isSuperAdmin,
                isCustomerReport,
            });
        }

        // if (dataForUpdate.isFavourite !== undefined && reportFromDb.isSystem) {
        //     throw new Errors.ValidationError(
        //         'System report can not change isFavourite',
        //         {
        //             method: 'UpdateReport',
        //             reportId: reportFromDb.id,
        //             customerId: reportFromDb.customerId,
        //             tenantId: reportFromDb.tenantId,
        //             appId: reportFromDb.appId,
        //             appUserId: reportFromDb.appUserId,
        //             isAdmin: isAdmin,
        //         }
        //     );
        // }

        const trx = (await this.knexService.transaction()) as Transaction;
        try {
            let dataset = reportFromDb.dataset;
            if (reportFromDb.datasetId !== dataForUpdate.datasetId) {
                dataset = await this.datasetRepository.findByID(
                    dataForUpdate.datasetId
                );

                if (
                    !dataset ||
                    dataset.customerId !== userData.customerId ||
                    dataset.tenantId !== userData.tenantId ||
                    dataset.appId !== userData.appId
                ) {
                    throw new Errors.NotFoundError('Dataset not found.', {
                        method: 'UpdateReport',
                        reportId: dataForUpdate.id,
                        customerId: dataForUpdate.customerId,
                        tenantId: dataForUpdate.tenantId,
                        appId: dataForUpdate.appId,
                        appUserId: dataForUpdate.appUserId,
                    });
                }

                dataForUpdate.datasetId = dataset.id;
            }

            var visualizations = JSON.parse(dataset.visualizations) as {
                name: string;
            }[];
            if (
                !visualizations.some(
                    (x) => x.name === dataForUpdate.visualizationType
                )
            ) {
                throw new Errors.ValidationError(
                    'VisualizationType not found in Dataset.',
                    {
                        method: 'UpdateReport',
                        reportId: dataForUpdate.id,
                        customerId: userData.customerId,
                        tenantId: userData.tenantId,
                        appId: userData.appId,
                        appUserId: dataForUpdate.appUserId,
                        visualizationType: dataForUpdate.visualizationType,
                        inDatasets: visualizations.map((x) => x.name).join(';'),
                    }
                );
            }

            let qlikState = reportFromDb.qlikState;
            //If dataForUpdate.qlikState is null that means
            //  we want to delete qlikState from Report
            //  null should be explicitly set on request payload
            //If dataForUpdate.qlikState is undefined means
            //  we are ignoring update of qlikState
            //  dataForUpdate.qlikState should be left out from request payload
            if (dataForUpdate.qlikState || dataForUpdate.qlikState === null) {
                const newQlikState = dataForUpdate.qlikState
                    ? this.qlikStateService.handleTextFields(
                          dataForUpdate.qlikState
                      )
                    : dataForUpdate.qlikState;

                qlikState = await this.qlikStateRepository.updateQlikState(
                    reportFromDb.qlikStateId,
                    newQlikState,
                    trx
                );

                if (!qlikState && dataForUpdate.qlikState !== null) {
                    throw new Errors.InternalError('QlikState update failed', {
                        method: 'UpdateReport',
                        reportId: reportId,
                        customerId: userData.customerId,
                        tenantId: userData.tenantId,
                        appId: userData.appId,
                        appUserId: userData.user.appUserId,
                    });
                }
                dataForUpdate.qlikStateId = qlikState ? qlikState.id : null;
                delete dataForUpdate.qlikState;
            }

            const report = await this.reportRepository.update(
                reportId,
                dataForUpdate,
                true,
                trx
            );

            if (!report) {
                throw new Errors.InternalError('Report update failed', {
                    method: 'UpdateReport',
                    reportId: reportId,
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    appUserId: userData.user.appUserId,
                });
            }

            await trx.commit();

            report.dataset = dataset;
            report.qlikState = qlikState;

            const sharedReportIds =
                await this.reportService.GetSharedByAppUserIds(
                    userData.user.appUserId
                );
            let result = this.reportService.setSystemAndSharingMetadata(
                report,
                sharedReportIds
            );

            result = (
                await this.reportService.SetSharedWithOthers([result], userData)
            )[0];

            result = this.reportService.checkIsPinwallableAllowed(result);

            if (
                dataForUpdate.isPinwallable === false &&
                reportFromDb.isPinwallable === true
            ) {
                await this.pinWallService.RemoveReportFromPinWall(
                    report.id,
                    report.appUserId,
                    report.customerId,
                    report.tenantId,
                    report.appId
                );
            }

            if (
                userData.user.appUserId === result.appUserId ||
                result.isSystem
            ) {
                result.user = userData.user;
            } else {
                const users = await this.userService.getAllUsersInfo(userData);
                result.user = AssignUser(result.appUserId, users);
            }
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
