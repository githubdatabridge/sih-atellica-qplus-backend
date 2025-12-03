import { BaseAction } from '../../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { ReportRepository } from '../../../repositories/ReportRepository';
import { UserService } from '../../../services';
import { QlikAuthData } from '../../../lib/qlik-auth';
import { AppUser } from '../../../entities/AppUser';
import { Errors } from '../../../lib';

@injectable()
@autoInjectable()
export class UsersWhoCanSeeReportsAction extends BaseAction<AppUser[]> {
    constructor(
        private reportRepository?: ReportRepository,
        private userService?: UserService
    ) {
        super();
    }

    async run(
        userData: QlikAuthData,
        id: number,
        includeMe: boolean
    ): Promise<AppUser[]> {
        const appUserIdsWhoCanSeeReport =
            await this.reportRepository.GetAllFollowersOfReport(
                userData.customerId,
                userData.tenantId,
                userData.appId,
                id
            );
        if (!appUserIdsWhoCanSeeReport.includes(userData.user.appUserId)) {
            throw new Errors.NotFoundError('Not found', {
                method: 'ReportsUsers',
                appUserId: userData.user.appUserId,
                reportId: id,
            });
        }

        let appUserIds: string[] = [...appUserIdsWhoCanSeeReport];

        if (!includeMe) {
            appUserIds.splice(appUserIds.indexOf(userData.user.appUserId), 1);
        }

        const users = await this.userService.getUsersInfo(appUserIds, userData);

        return users;
    }
}
