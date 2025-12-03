import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import {
    DatasetRepository,
    QlikStateRepository,
    ReportRepository,
    UserReportRepository,
} from '../../repositories';
import { QlikAuthData } from '../../lib/qlik-auth';
import { Errors, SCOPE } from '../../lib';
import { KnexService, PinWallService } from '../../services';
import { Transaction } from 'knex/lib';
import { checkIfUserIsAdmin } from '../../lib/util';

@injectable()
@autoInjectable()
export class DeleteReportAction extends BaseAction<void> {
    constructor(
        private reportRepository: ReportRepository,
        private userReportRepository: UserReportRepository,
        private qlikStateRepository: QlikStateRepository,
        private knexService: KnexService,
        private pinWallService: PinWallService
    ) {
        super();
    }

    async run(userData: QlikAuthData, id: number): Promise<void> {
        const report = await this.reportRepository.findByID(id);

        if (
            !report ||
            userData.appId !== report.appId ||
            userData.customerId !== report.customerId ||
            userData.tenantId !== report.tenantId
        ) {
            throw new Errors.NotFoundError('Not found', {
                method: 'DeleteReport',
                appUserId: userData.user.appUserId,
                id,
            });
        }
        const isAdmin = checkIfUserIsAdmin(userData);
        const isDeleteAllowed =
            isAdmin || report.appUserId === userData.user.appUserId;

        if (!isDeleteAllowed) {
            throw new Errors.NotFoundError('Not found', {
                method: 'DeleteReport',
                id,
                reportAppUserId: report.appUserId,
                appUserId: userData.user.appUserId,
            });
        }

        const isCustomerReport = !report.templateId;
        const isSuperAdmin = checkIfUserIsAdmin(userData, [SCOPE.DS_WRITE]);

        if (!isCustomerReport && !isSuperAdmin) {
            throw new Errors.Forbidden('Insufficient scope.', {
                method: 'DeleteReport',
                id,
                appUserId: userData.user.appUserId,
                isSuperAdmin,
                isCustomerReport,
            });
        }

        const trx = (await this.knexService.transaction()) as Transaction;
        try {
            if (report.qlikStateId) {
                await this.qlikStateRepository.deleteWhere(
                    {
                        id: report.qlikStateId,
                    },
                    trx
                );
            }

            await this.userReportRepository.deleteWhere({ reportId: id }, trx);
            await this.reportRepository.deleteWhere({ id }), trx;

            await trx.commit();

            if (report.isPinwallable) {
                await this.pinWallService.RemoveReportFromPinWall(
                    report.id,
                    report.appUserId,
                    report.customerId,
                    report.tenantId,
                    report.appId
                );
            }
        } catch (error) {
            await trx.rollback(new Error('Condition caused rollback!'));
            throw error;
        }
    }
}
