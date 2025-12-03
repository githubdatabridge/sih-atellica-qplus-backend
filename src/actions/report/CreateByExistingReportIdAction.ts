import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { Report } from '../../entities';
import { ReportRepository } from '../../repositories';
import { Errors } from '../../lib';
import { QlikAuthData } from '../../lib/qlik-auth';
import { ReportService, UserService } from '../../services';

@injectable()
@autoInjectable()
export class CreateByExistingReportIdAction extends BaseAction<Report> {
    constructor(
        private reportRepository: ReportRepository,
        private userService: UserService,
        private reportService?: ReportService
    ) {
        super();
    }

    async run(reportId: number, userData: QlikAuthData): Promise<Report> {
        const reports = await this.reportRepository.getAllReports(
            null,
            userData.user.appUserId,
            userData.customerId,
            userData.tenantId,
            userData.appId,
            ['dataset', 'qlik_state'],
            { id: reportId }
        );

        if (!reports || !reports.data || !Array.isArray(reports.data)) {
            throw new Errors.InternalError('Failed retrieve reports.', {
                action: 'CreateByExistingReportId',
                method: 'run',
                reportId: reportId,
                appUserId: userData.user.appUserId,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
            });
        }

        const report = reports.data[0];

        if (
            !report ||
            report.customerId !== userData.customerId ||
            report.tenantId !== userData.tenantId ||
            report.appId !== userData.appId
        ) {
            throw new Errors.NotFoundError('Not found.', {
                action: 'CreateByExistingReportId',
                method: 'run',
                reportId: reportId,
                appUserId: userData.user.appUserId,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
            });
        }

        const titleSuffix = '(Copy)';
        const newReport: Report = {
            appUserId: userData.user.appUserId,
            customerId: report.customerId,
            tenantId: report.tenantId,
            appId: report.appId,

            content: report.content,
            description: report.description,
            title: `${report.title} ${titleSuffix}`,
            isPinwallable: report.isPinwallable,
            isFavourite: report.isFavourite,
            pageId: report.pageId,
            visualizationType: report.visualizationType,
            qlikStateId: report.qlikStateId,
            datasetId: report.datasetId,
        };

        const createdReport = await this.reportRepository.create(newReport);

        if (!createdReport) {
            throw new Errors.InternalError('Failed to create report.', {
                action: 'CreateByExistingReportId',
                method: 'run',
                reportId: reportId,
                appUserId: userData.user.appUserId,
            });
        }

        createdReport.dataset = report.dataset;
        createdReport.qlikState = report.qlikState;

        const users = await this.userService.getAllUsersInfo(userData);

        const result = await this.reportService.PrepareReport(
            userData,
            createdReport,
            users
        );

        return result;
    }
}
