import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { ChartType, Dataset, Report } from '../../entities';
import { DatasetRepository } from '../../repositories/DatasetRepository';
import { Errors } from '../../lib';
import { checkIfUserIsAdmin, handleTextFields } from '../../lib/util';
import { QlikAuthData } from '../../lib/qlik-auth';
import { DatasetService } from '../../services/DatasetService';
import { Transaction } from 'knex/lib';
import { KnexService, PinWallService } from '../../services';
import { ReportRepository, UserReportRepository } from '../../repositories';

@injectable()
@autoInjectable()
export class UpdateDatasetAction extends BaseAction<Dataset> {
    constructor(
        private datasetService?: DatasetService,
        private reportRepository?: ReportRepository,
        private userReportRepository?: UserReportRepository,
        private datasetRepository?: DatasetRepository,
        private pinWallService?: PinWallService,
        private knexService?: KnexService
    ) {
        super();
    }

    async run(
        id: number,
        datasetForUpdate: Dataset,
        userData: QlikAuthData,
        cascade = false
    ): Promise<Dataset> {
        const isAdmin = checkIfUserIsAdmin(userData);
        if (!isAdmin) {
            throw new Errors.Forbidden(
                'Dataset can be updated only by User with Admin role.',
                {
                    method: 'CreateDataset',
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    appUserId: userData.user.appUserId,
                }
            );
        }

        const datasetFromDb = await this.datasetRepository.findByID(id);

        if (
            !datasetFromDb ||
            datasetFromDb.customerId !== userData.customerId ||
            datasetFromDb.tenantId !== userData.tenantId ||
            datasetFromDb.appId !== userData.appId
        ) {
            throw new Errors.NotFoundError('Not found.', {
                method: 'UpdateDataset',
                datasetId: id,
                appUserId: userData.user.appUserId,
            });
        }

        const isTitleUnique = await this.datasetService.checkIsTitleUnique(
            datasetForUpdate.title,
            userData,
            [id]
        );

        if (!isTitleUnique) {
            throw new Errors.AlreadyExistsError(
                `Dataset with title [${datasetForUpdate.title}] already exists.`,
                {
                    method: 'UpdateDataset',
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    appUserId: userData.user.appUserId,
                    title: datasetForUpdate.title,
                }
            );
        }

        const qlikApp = this.datasetService.getQlikApp(
            datasetForUpdate.qlikAppId,
            userData
        );

        if (!qlikApp) {
            throw new Errors.ValidationError('Invalid qlikAppId.', {
                method: 'UpdateDataset',
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                appUserId: userData.user.appUserId,
                qlikAppId: datasetForUpdate.qlikAppId,
            });
        }

        datasetForUpdate.appUserId = datasetFromDb.appUserId;
        datasetForUpdate.customerId = datasetFromDb.customerId;
        datasetForUpdate.tenantId = datasetFromDb.tenantId;
        datasetForUpdate.appId = datasetFromDb.appId;

        const visualizationsForUpdate =
            datasetForUpdate.visualizations as unknown as ChartType[];

        const visualizationsFromDb = handleTextFields(
            datasetFromDb.visualizations
        ) as ChartType[];

        const isVisualizationMissing =
            visualizationsForUpdate.length < visualizationsFromDb.length;
        const isVisualizationNameChange = visualizationsFromDb.some(
            (x) => !visualizationsForUpdate.map((k) => k.name).includes(x.name)
        );

        const reportsToRemove: Report[] = [];
        const reportToUpdateVisTypes: { ids: number[]; visType: string }[] = [];

        if (isVisualizationMissing || isVisualizationNameChange) {
            throw new Errors.ValidationError(
                'Visualization can not be removed or change name.\n' +
                    'You have to marked for with [remove] or [changeName]',
                {
                    method: 'UpdateDataset',
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    appUserId: userData.user.appUserId,
                }
            );
        }

        const isNameUnique =
            [
                ...new Set(
                    visualizationsForUpdate.map((x) =>
                        x.mark === 'changeName' ? x.markParam : x.name
                    )
                ),
            ].length === visualizationsForUpdate.length;

        if (!isNameUnique) {
            throw new Errors.ValidationError('Visualization name not unique', {
                method: 'CreateDataset',
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                appUserId: userData.user.appUserId,
            });
        }

        if (
            visualizationsForUpdate.filter((x) => x.mark !== 'remove')
                .length === 0
        ) {
            throw new Errors.ValidationError(
                'Dataset can not have empty array visualizations.',
                {
                    action: 'UpdateDataset',
                    appUserId: userData.user.appUserId,
                    count: visualizationsForUpdate.filter(
                        (x) => x.mark !== 'remove'
                    ).length,
                }
            );
        }

        if (visualizationsForUpdate.some((x) => x.mark === 'remove')) {
            const missingVisNames = visualizationsForUpdate
                .filter((x) => x.mark === 'remove')
                .map((x) => x.name);

            var reports = await this.reportRepository.findAllInFieldWhere(
                'visualizationType',
                missingVisNames,
                {
                    datasetId: datasetFromDb.id,
                }
            );

            if (reportsToRemove.length > 0 && cascade === false) {
                throw new Errors.Forbidden(
                    'Dataset visualization can be deleted only if it is not assigned to any report',
                    {
                        method: 'UpdateDataset',
                        customerId: userData.customerId,
                        tenantId: userData.tenantId,
                        appId: userData.appId,
                        appUserId: userData.user.appUserId,
                        reportsIds: reportsToRemove.map((x) => x.id),
                    }
                );
            }

            reports.forEach((x) => reportsToRemove.push(x));
        }

        if (visualizationsForUpdate.some((x) => x.mark === 'changeName')) {
            const visualizationNamesToChange = visualizationsFromDb
                .filter((x) => x.mark === 'changeName')
                .map((x) => {
                    return { newName: x.markParam, currentName: x.name };
                });

            const reports = await this.reportRepository.findAllInFieldWhere(
                'visualizationType',
                visualizationNamesToChange.map((x) => x.currentName),
                {
                    datasetId: datasetFromDb.id,
                }
            );

            if (!reports || !Array.isArray(reports)) {
                throw new Errors.InternalError(
                    'Dataset update failed. Reports not queried.',
                    {
                        method: 'UpdateDataset',
                        datasetId: datasetFromDb.id,
                        customerId: userData.customerId,
                        tenantId: userData.tenantId,
                        appId: userData.appId,
                        appUserId: userData.user.appUserId,
                    }
                );
            }

            if (reports.length < 0) {
                visualizationNamesToChange.forEach((vis) => {
                    reportToUpdateVisTypes.push({
                        visType: vis.newName,
                        ids: reports
                            .filter(
                                (r) => r.visualizationType === vis.currentName
                            )
                            .map((r) => r.id),
                    });
                });
            }
        }

        const trx = (await this.knexService.transaction()) as Transaction;

        try {
            if (reportsToRemove.length > 0) {
                await this.userReportRepository.deleteWhereIn(
                    'reportId',
                    reportsToRemove.map((x) => x.id),
                    trx
                );

                await this.reportRepository.deleteWhereIn(
                    'id',
                    reportsToRemove.map((x) => x.id),
                    trx
                );

                for (const report of reportsToRemove) {
                    if (report.isPinwallable) {
                        await this.pinWallService.RemoveReportFromPinWall(
                            report.id,
                            report.appUserId,
                            report.customerId,
                            report.tenantId,
                            report.appId,
                            trx
                        );
                    }
                }
            }

            if (reportToUpdateVisTypes.length > 0) {
                for (const reportToUpdateVisType of reportToUpdateVisTypes) {
                    await this.reportRepository.updateReportsVisualizationType(
                        reportToUpdateVisType.ids,
                        reportToUpdateVisType.visType,
                        trx
                    );
                }
            }

            var data = visualizationsForUpdate
                .filter((x) => x.mark !== 'remove')
                .map((x) => {
                    var c: ChartType = {
                        name: x.mark === 'changeName' ? x.markParam : x.name,
                        isBaseChart: x.isBaseChart,
                        properties: x.properties,
                    };
                    return c;
                });

            datasetForUpdate.visualizations = data as any;

            datasetForUpdate =
                this.datasetService.handleTextFields(datasetForUpdate);

            let result = await this.datasetRepository.update(
                datasetFromDb.id,
                datasetForUpdate,
                true,
                trx
            );

            result = this.datasetService.handleTextFields(result);
            await trx.commit();

            result.qlikApp = qlikApp;
            return result;
        } catch (error) {
            await trx.rollback(new Error('Condition caused rollback!'));
            throw error;
        }
    }
}
