import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { Report } from '../../entities';
import { ReportRepository } from '../../repositories';
import { Errors } from '../../lib';
import { QlikAuthData } from '../../lib/qlik-auth';
import { ReportService, UserService } from '../../services';
import { checkIfUserIsAdmin } from '../../lib/util';
import { RepositoryResponse } from '../../repositories/BaseRepository';

@injectable()
@autoInjectable()
export class GetReportByIdAction extends BaseAction<Report> {
    constructor(
        private reportRepository: ReportRepository,
        private userService: UserService,
        private reportService?: ReportService
    ) {
        super();
    }

    async run(reportId: number, userData: QlikAuthData): Promise<Report> {
        const isAdmin = checkIfUserIsAdmin(userData);

        let reports: RepositoryResponse<Report[]> = {};

        if (isAdmin) {
            reports = await this.reportRepository.getAll(
                {
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    id: reportId,
                },
                ['dataset', 'qlik_state']
            );
        } else {
            const options = {
                withTemplate: true,
                withShared: true,
                withPersonal: true,
            };

            reports = await this.reportRepository.getAllReports(
                options,
                userData.user.appUserId,
                userData.customerId,
                userData.tenantId,
                userData.appId,
                ['dataset', 'qlik_state'],
                { id: reportId }
            );
        }

        if (!reports.data || !Array.isArray(reports.data)) {
            throw new Errors.InternalError('Failed to retrieve reports.', {
                method: 'GetReportById',
                reportId: reportId,
                appUserId: userData.user.appUserId,
            });
        }

        const report = reports.data[0];

        if (!report) {
            throw new Errors.NotFoundError('Report does not exist.', {
                method: 'GetReportById',
                reportId: reportId,
                appUserId: userData.user.appUserId,
            });
        }

        const users = await this.userService.getAllUsersInfo(userData);

        const result = await this.reportService.PrepareReport(
            userData,
            report,
            users
        );

        return result;
    }
}
