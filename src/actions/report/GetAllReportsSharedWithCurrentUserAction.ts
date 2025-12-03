import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { Report } from '../../entities';
import { ReportRepository } from '../../repositories';
import { QlikAuthData } from '../../lib/qlik-auth';
import { ReportService, UserService } from '../../services';
import {
    PaginationParams,
    RepositoryResponse,
} from '../../repositories/BaseRepository';

@injectable()
@autoInjectable()
export class GetAllReportsSharedWithCurrentUserAction extends BaseAction<
    RepositoryResponse<Report[]>
> {
    constructor(
        private reportRepository: ReportRepository,
        private reportService?: ReportService,
        private userService?: UserService
    ) {
        super();
    }

    async run(
        userData: QlikAuthData,
        filter?: string[][],
        pagination?: PaginationParams
    ): Promise<RepositoryResponse<Report[]>> {
        const options = {
            withTemplate: false,
            withShared: true,
            withPersonal: false,
        };

        const result = await this.reportRepository.getAllReports(
            options,
            userData.user.appUserId,
            userData.customerId,
            userData.tenantId,
            userData.appId,
            ['dataset', 'qlik_state'],
            null,
            filter,
            null,
            null,
            pagination
        );

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
