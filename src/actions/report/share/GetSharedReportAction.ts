import { BaseAction } from '../../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { UserReportRepository } from '../../../repositories';
import { ReportRepository } from '../../../repositories/ReportRepository';
import { Errors } from '../../../lib';
import { UserService } from '../../../services';
import { checkIfUserIsAdmin } from '../../../lib/util';
import { QlikAuthData } from '../../../lib/qlik-auth';
import { AppUser } from '../../../entities/AppUser';

@injectable()
@autoInjectable()
export class GetSharedReportAction extends BaseAction<AppUser[]> {
    constructor(
        private reportRepository?: ReportRepository,
        private userReportRepository?: UserReportRepository,
        private userService?: UserService
    ) {
        super();
    }

    async run(reportId: number, userData: QlikAuthData): Promise<AppUser[]> {
        const report = await this.reportRepository.findByID(reportId);

        if (!report || userData.qlikAppId !== report.appId) {
            throw new Errors.NotFoundError('Not found', {
                method: 'GetShareReport',
                appUserId: userData.user.appUserId,
                id: reportId,
            });
        }
        const appUserIdsWhoCanSeeReport =
            await this.reportRepository.GetAllFollowersOfReport(
                userData.customerId,
                userData.tenantId,
                userData.appId,
                reportId
            );

        const isGetAllowed =
            appUserIdsWhoCanSeeReport.includes(userData.user.appUserId) ||
            checkIfUserIsAdmin(userData);
        if (!isGetAllowed) {
            throw new Errors.NotFoundError('Not found', {
                method: 'GetShareReport',
                id: reportId,
                reportAppUserId: report.appUserId,
                appUserId: userData.user.appUserId,
            });
        }

        const isSystem = report.isSystem;
        if (isSystem) {
            throw new Errors.NotFoundError('System reports are not shareable', {
                method: 'GetShareReport',
                appUserId: userData.user.appUserId,
                isSystem: isSystem,
                id: reportId,
            });
        }

        const userReports = await this.userReportRepository.findAll({
            reportId,
        });
        const appUserIds = userReports.map((x) => x.appUserId);

        const result = await this.userService.getUsersInfo(
            appUserIds,
            userData
        );
        return result;
    }
}
