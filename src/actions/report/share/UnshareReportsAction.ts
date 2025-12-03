import { BaseAction } from '../../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { UserReportRepository } from '../../../repositories';
import { ReportRepository } from '../../../repositories/ReportRepository';
import { QlikAuthData } from '../../../lib/qlik-auth';
import { Errors } from '../../../lib';
import { checkIfUserIsAdmin } from '../../../lib/util';
import { Report } from '../../../entities';
@injectable()
@autoInjectable()
export class UnshareReportsAction extends BaseAction<void> {
    constructor(
        private reportRepository?: ReportRepository,
        private userReportRepository?: UserReportRepository
    ) {
        super();
    }

    async run(
        reportId: number,
        listOfCandidatesForUnshare: string[],
        userData: QlikAuthData
    ): Promise<void> {
        const report = await this.reportRepository.findByID(reportId);
        if (
            !report ||
            userData.customerId !== report.customerId ||
            userData.tenantId !== report.tenantId ||
            userData.appId !== report.appId
        ) {
            throw new Errors.NotFoundError('Not found', {
                method: 'UnshareReport',
                appUserId: userData.user.appUserId,
                id: reportId,
            });
        }

        const sharedReports = await this.userReportRepository.findAll({
            reportId,
        });

        if (sharedReports.length === 0) {
            throw new Errors.NotFoundError('Not found', {
                method: 'UnshareReport',
                sharedReports: sharedReports.length,
                appUserId: userData.user.appUserId,
                id: reportId,
            });
        }

        const isUnshareAllowed = this.IsUserAllowedToUnshareReport(
            userData,
            report,
            listOfCandidatesForUnshare
        );
        if (!isUnshareAllowed) {
            throw new Errors.NotFoundError('Not found', {
                method: 'UnshareReport',
                id: reportId,
                reportAppUserId: report.appUserId,
                appUserId: userData.user.appUserId,
                isAdmin: checkIfUserIsAdmin(userData),
            });
        }

        const invalidUserIds = [];

        listOfCandidatesForUnshare.forEach((appUserId) => {
            if (!sharedReports.some((sr) => sr.appUserId === appUserId)) {
                invalidUserIds.push(appUserId);
            }
        });

        const isOneOfUsersOwner = listOfCandidatesForUnshare.includes(
            report.appUserId
        );
        if (isOneOfUsersOwner) {
            invalidUserIds.push(userData.user.appUserId);
        }

        const isUsersValid = invalidUserIds.length === 0;
        if (!isUsersValid) {
            throw new Errors.BadDataError(
                'Report can not be unshared with one or more given user.',
                {
                    method: 'UnshareReport',
                    appUserId: userData.user.appUserId,
                    invalidUserIds,
                    id: reportId,
                }
            );
        }

        const reportIdsToUnshare = sharedReports
            .filter((sr) => listOfCandidatesForUnshare.includes(sr.appUserId))
            .map((x) => x.id);

        await this.userReportRepository.deleteWhereIn('id', reportIdsToUnshare);
    }

    private IsUserAllowedToUnshareReport(
        userData: QlikAuthData,
        report: Report,
        unsharedCandidates: string[]
    ) {
        if (checkIfUserIsAdmin(userData)) {
            return true;
        } else if (userData.user.appUserId === report.appUserId) {
            return true;
        } else if (
            unsharedCandidates.length === 1 &&
            unsharedCandidates[0] === userData.user.appUserId
        ) {
            return true;
        }
        return false;
    }
}
