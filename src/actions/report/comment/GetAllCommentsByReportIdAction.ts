import { BaseAction } from '../../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { Comment } from '../../../entities';
import { CommentRepository } from '../../../repositories';
import { ReportRepository } from '../../../repositories/ReportRepository';
import { CommentService, ReportService, UserService } from '../../../services';
import { QlikAuthData } from '../../../lib/qlik-auth';
import { Errors } from '../../../lib';
import { RepositoryResponse } from '../../../repositories/BaseRepository';

@injectable()
@autoInjectable()
export class GetAllCommentsByReportIdAction extends BaseAction<
    RepositoryResponse<Comment[]>
> {
    constructor(
        private reportRepository?: ReportRepository,
        private commentRepository?: CommentRepository,
        private commentService?: CommentService,
        private userService?: UserService
    ) {
        super();
    }

    async run(
        reportId: number,
        userData: QlikAuthData,
        filter: any[],
        pagination
    ): Promise<RepositoryResponse<Comment[]>> {
        const options = {
            withTemplate: true,
            withShared: true,
            withPersonal: true,
        };

        const reports = await this.reportRepository.getAllReports(
            options,
            userData.user.appUserId,
            userData.customerId,
            userData.tenantId,
            userData.appId,
            ['dataset', 'qlik_state'],
            { id: reportId }
        );

        if (!reports.data || !Array.isArray(reports.data)) {
            throw new Errors.InternalError('Failed to retrieve reports.', {
                action: 'GetAllCommentsByReportIdAction',
                method: 'run',
                reportId: reportId,
                appUserId: userData.user.appUserId,
            });
        }

        const report = reports.data[0];

        if (!report) {
            throw new Errors.NotFoundError('Report not found.', {
                action: 'GetAllCommentsByReportIdAction',
                reportId: reportId,
                appId: userData.appId,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
            });
        }

        const result = await this.commentRepository.listAll(
            {
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                reportId,
            },
            null,
            filter,
            pagination
        );

        const users = await this.userService.getAllUsersInfo(userData);

        result.data = await this.commentService.PrepareComments(
            result.data,
            userData,
            users
        );

        return result;
    }
}
