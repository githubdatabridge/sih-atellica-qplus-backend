import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { DatasetRepository } from '../../repositories/DatasetRepository';
import { Errors } from '../../lib';
import { checkIfUserIsAdmin } from '../../lib/util';
import { QlikAuthData } from '../../lib/qlik-auth';
import { ReportRepository, UserReportRepository } from '../../repositories';
import { KnexService, PinWallService } from '../../services';
import { Transaction } from 'knex/lib';

@injectable()
@autoInjectable()
export class DeleteDatasetAction extends BaseAction<void> {
    constructor(
        private reportRepository?: ReportRepository,
        private datasetRepository?: DatasetRepository,
        private userReportRepository?: UserReportRepository,
        private pinWallService?: PinWallService,
        private knexService?: KnexService
    ) {
        super();
    }

    async run(
        id: number,
        userData: QlikAuthData,
        cascade = false
    ): Promise<void> {
        const isAdmin = checkIfUserIsAdmin(userData);
        if (!isAdmin) {
            throw new Errors.Forbidden(
                'Dataset can be delete only by User with Admin role.',
                {
                    method: 'DeleteDataset',
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    appUserId: userData.user.appUserId,
                }
            );
        }

        const dataset = await this.datasetRepository.findByID(id);

        if (
            !dataset ||
            dataset.customerId !== userData.customerId ||
            dataset.tenantId !== userData.tenantId ||
            dataset.appId !== userData.appId
        ) {
            throw new Errors.NotFoundError('Not found.', {
                method: 'DeleteDataset',
                datasetId: id,
                appUserId: userData.user.appUserId,
            });
        }

        const reports = await this.reportRepository.findAll({
            datasetId: dataset.id,
        });

        if (reports.length > 0 && cascade === false) {
            throw new Errors.Forbidden(
                'Dataset can be deleted only if it is not assigned to any report',
                {
                    method: 'DeleteDataset',
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    appUserId: userData.user.appUserId,
                    reportsIds: reports.map((x) => x.id),
                }
            );
        }
        const trx = (await this.knexService.transaction()) as Transaction;

        try {
            if (reports.length > 0) {
                await this.userReportRepository.deleteWhereIn(
                    'reportId',
                    reports.map((x) => x.id),
                    trx
                );

                await this.reportRepository.deleteWhereIn(
                    'id',
                    reports.map((x) => x.id),
                    trx
                );

                for (const report of reports) {
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

            await this.datasetRepository.deleteWhere({ id: dataset.id }, trx);

            await trx.commit();
        } catch (error) {
            await trx.rollback(new Error('Condition caused rollback!'));
            throw error;
        }
    }
}
