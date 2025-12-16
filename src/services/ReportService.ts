import { injectable } from 'tsyringe';
import { Report } from '../entities';
import { AppUser } from '../entities/AppUser';
import { Errors } from '../lib';
import { QlikAuthData } from '../lib/qlik-auth';
import { AssignUser, checkIfUserIsAdmin, handleTextFields } from '../lib/util';
import { UserReportRepository } from '../repositories';
import { DatasetService } from './DatasetService';

@injectable()
export class ReportService {
    constructor(
        private userReportRepository?: UserReportRepository,
        private datasetService?: DatasetService
    ) {}

    setSystemAndSharingMetadata(report: Report, sharedReportIds: number[]) {
        report.shared = sharedReportIds.includes(report.id);

        if (report.dataset) {
            report.dataset = this.datasetService.handleTextFields(
                report.dataset
            );
        }

        report.content = handleTextFields(report.content);

        return report;
    }

    checkIsPinwallableAllowed(report: Report) {
        if (report.shared === undefined) {
            throw new Errors.InternalError(
                'Shared flags not set on report object.',
                {
                    service: 'ReportService',
                    method: 'checkIsPinwallableAllowed',
                    shared: report.shared,
                }
            );
        }

        if (report.shared) {
            report.isPinwallable = false;
        }

        return report;
    }

    async SetSharedWithOthers(reports: Report[], userData: QlikAuthData) {
        const isAdmin = checkIfUserIsAdmin(userData);

        const userReport = await this.userReportRepository.findAllInField(
            'reportId',
            reports.map((report) => report.id)
        );

        reports.forEach((report) => {
            const isMine = report.appUserId === userData.user.appUserId;
            const isAllowedToSeeFlag = isMine || isAdmin;

            if (!report.isSystem && isAllowedToSeeFlag) {
                report.sharedWithOthers = userReport.some(
                    (userReport) => userReport.reportId === report.id
                );
            }
        });
        return reports;
    }

    async GetSharedByAppUserIds(appUserId: string): Promise<number[]> {
        return (await this.userReportRepository.findAll({ appUserId })).map(
            (x) => x.reportId
        );
    }

    IsAllowedToSee(
        userData: QlikAuthData,
        report: Report,
        sharedReportIds: number[]
    ): boolean {
        const isAdmin = checkIfUserIsAdmin(userData);
        const isSharedWithMe = sharedReportIds.includes(report.id);
        const isSystem = report.isSystem;
        const isMine = report.appUserId === userData.user.appUserId;

        return isSystem || isSharedWithMe || isMine || isAdmin;
    }

    async PrepareReport(
        userData: QlikAuthData,
        report: Report,
        users: AppUser[],
        sharedReportIds?: number[]
    ): Promise<Report> {
        let result = { ...report };
        if (!sharedReportIds) {
            sharedReportIds = await this.GetSharedByAppUserIds(
                userData.user.appUserId
            );
        }

        const IsAllowedToSee = this.IsAllowedToSee(
            userData,
            report,
            sharedReportIds
        );

        if (!IsAllowedToSee) {
            throw new Errors.InternalError(
                'Report that is processing is not allowed to be seen by current User.',
                {
                    method: 'PrepareReport',
                    reportId: report.id,
                    customerId: report.customerId,
                    tenantId: report.tenantId,
                    appId: report.appId,
                    userId: report.appUserId,
                }
            );
        }

        result = await this.setSystemAndSharingMetadata(
            result,
            sharedReportIds
        );

        result = (await this.SetSharedWithOthers([result], userData))[0];

        result = this.checkIsPinwallableAllowed(result);

        result.user = AssignUser(result.appUserId, users);

        if (result.appUserId === 'SYSTEM_V1') {
            result.user = {
                name: 'SYSTEM_V1',
                appUserId: 'SYSTEM_V1',
                email: '',
            };
        }

        if (result.dataset) {
            result.dataset.qlikApp = this.datasetService.getQlikApp(
                result.dataset.qlikAppId,
                userData
            );
        }

        return result;
    }

    async PrepareReports(
        userData: QlikAuthData,
        reports: Report[],
        users: AppUser[]
    ): Promise<Report[]> {
        const result: Report[] = [];
        const sharedReportIds = await this.GetSharedByAppUserIds(
            userData.user.appUserId
        );

        for (const report of reports) {
            result.push(
                await this.PrepareReport(
                    userData,
                    report,
                    users,
                    sharedReportIds
                )
            );
        }

        return result;
    }
}
