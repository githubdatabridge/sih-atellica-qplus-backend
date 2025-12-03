import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { Report } from '../../entities';
import { ReportRepository, UserReportRepository } from '../../repositories';
import { QlikAuthData } from '../../lib/qlik-auth';
import { ReportService, UserService } from '../../services';
import { checkIfUserIsAdmin } from '../../lib/util';
import {
    PaginationParams,
    RepositoryResponse,
} from '../../repositories/BaseRepository';
@injectable()
@autoInjectable()
export class GetAllReportsAction extends BaseAction<
    RepositoryResponse<Report[]>
> {
    constructor(
        private reportRepository: ReportRepository,
        private userReportRepository: UserReportRepository,
        private reportService?: ReportService,
        private userService?: UserService
    ) {
        super();
    }

    async run(
        userData: QlikAuthData,
        filter?: string[][],
        search?: string[][],
        orderBy?: string[],
        pagination?: PaginationParams
    ): Promise<RepositoryResponse<Report[]>> {
        const isAdmin = checkIfUserIsAdmin(userData);

        let result: RepositoryResponse<Report[]> = {};

        if (isAdmin) {
            result = await this.reportRepository.getAll(
                {
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                },
                ['dataset', 'qlik_state'],
                filter,
                pagination,
                orderBy,
                null,
                search
            );
        } else {
            const options = {
                withTemplate: true,
                withShared: true,
                withPersonal: true,
            };

            result = await this.reportRepository.getAllReports(
                options,
                userData.user.appUserId,
                userData.customerId,
                userData.tenantId,
                userData.appId,
                ['dataset', 'qlik_state'],
                null,
                filter,
                search,
                orderBy,
                pagination
            );
        }

        const users = await this.userService.getAllUsersInfo(userData);

        const reports = await this.reportService.PrepareReports(
            userData,
            result.data,
            users
        );
        result.data = reports;
        return result;
    }
}
