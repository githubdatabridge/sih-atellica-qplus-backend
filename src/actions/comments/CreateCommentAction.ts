import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import {
    CommentRepository,
    VisualizationRepository,
    QlikStateRepository,
    ReportRepository,
} from '../../repositories';
import {
    ActionType,
    Comment,
    CommentType,
    NotificationType,
    QlikState,
    Report,
    Visualization,
} from '../../entities';
import * as Errors from '../../lib/errors';
import {
    NotifyOnCommentService,
    QlikStateService,
    ReportService,
    UserService,
} from '../../services';
import { QlikAuthData } from '../../lib/qlik-auth';
import { checkIfUserIsAdmin } from '../../lib/util';
import { AppUser } from '../../entities/AppUser';

@injectable()
@autoInjectable()
export class CreateCommentAction extends BaseAction<Comment> {
    constructor(
        private commentRepository?: CommentRepository,
        private visualizationRepository?: VisualizationRepository,
        private qlikStateRepository?: QlikStateRepository,
        private reportRepository?: ReportRepository,
        private reportService?: ReportService,
        private notifyService?: NotifyOnCommentService,
        private qlikStateService?: QlikStateService,
        private userService?: UserService
    ) {
        super();
    }

    async run(data: Comment, userData: QlikAuthData): Promise<Comment> {
        let parentComment: Comment;
        let visualization: Visualization;
        let report: Report;
        const commentType = getCommentType(data);

        const users = await this.userService.getAllUsersInfo(userData);
        data.customerId = userData.customerId;
        data.tenantId = userData.tenantId;
        data.appId = userData.appId;
        data.appUserId = userData.user.appUserId;

        if (data.commentId) {
            if (data.qlikState) {
                throw new Errors.ValidationError(
                    'Child comments can not have qlikState',
                    {
                        method: 'CreateCommentAction',
                        commentId: data.commentId,
                        userId: data.appUserId,
                        customerId: userData.customerId,
                        tenantId: userData.tenantId,
                        appId: userData.appId,
                    }
                );
            }

            const existingComment = await this.commentRepository.findByID(
                data.commentId
            );

            if (
                !existingComment ||
                existingComment.customerId !== userData.customerId ||
                existingComment.tenantId !== userData.tenantId ||
                existingComment.appId !== userData.appId
            ) {
                throw new Errors.NotFoundError(
                    'Parent comment does not exist',
                    {
                        method: 'CreateCommentAction',
                        commentId: data.commentId,
                        userId: data.appUserId,
                        customerId: userData.customerId,
                        tenantId: userData.tenantId,
                        appId: userData.appId,
                    }
                );
            }

            if (getCommentType(existingComment) !== commentType) {
                throw new Errors.ValidationError(
                    'You cannot comment a comment of different type.',
                    {
                        method: 'CreateCommentAction',
                        commentId: data.commentId,
                        userId: data.appUserId,
                        customerId: userData.customerId,
                        tenantId: userData.tenantId,
                        appId: userData.appId,
                        commentType,
                    }
                );
            }

            if (existingComment.commentId) {
                throw new Errors.ValidationError(
                    'You cannot comment child comment',
                    {
                        method: 'CreateCommentAction',
                        commentId: data.commentId,
                        userId: data.appUserId,
                        customerId: userData.customerId,
                        tenantId: userData.tenantId,
                        appId: userData.appId,
                    }
                );
            }
            parentComment = existingComment;
        }

        if (data.visualizationId) {
            visualization = await this.ValidateVisualization(data);
        } else if (data.reportId) {
            report = await this.ValidateReport(data, userData, users);
        } else {
            throw new Errors.ValidationError(
                'Invalid data for creating comment',
                {
                    method: 'CreateCommentAction',
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    visualizationId: data.visualizationId,
                    reportId: data.reportId,
                    userId: data.appUserId,
                }
            );
        }

        let qlikState: QlikState;
        if (data.qlikState) {
            const newQlikState = this.qlikStateService.handleTextFields(
                data.qlikState
            );
            qlikState = await this.qlikStateRepository.create(newQlikState);

            if (!qlikState) {
                throw new Errors.InternalError('qlikState creation failed', {
                    method: 'CreateCommentAction',
                    commentId: data.commentId,
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    userId: data.appUserId,
                });
            }

            data.qlikStateId = qlikState.id;
        }

        delete data.qlikState;

        const result = await this.commentRepository.create(data);

        result.comments = [];
        result.reactions = [];
        result.parentComment = parentComment;
        result.visualization = visualization;
        result.report = report;
        result.user = userData.user;

        if (qlikState) {
            result.qlikState = qlikState;
        }

        this.notifyService.defineHandlers(
            [
                ActionType.UserTaggedInComment,
                ActionType.UserCommentReplied,
                ActionType.UserCommentCreated,
            ],
            [
                NotificationType.CustomerCommentCountChanged,
                NotificationType.ReportCommentCountChanged,
            ]
        );

        await this.notifyService.process(userData, result, users);

        return result;
    }

    private async ValidateReport(
        data: Comment,
        userData: QlikAuthData,
        users: AppUser[]
    ): Promise<Report> {
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
            { id: data.reportId }
        );

        if (!reports.data || !Array.isArray(reports.data)) {
            throw new Errors.InternalError('Failed to retrieve reports.', {
                action: 'CreateCommentAction',
                method: 'ValidateReport',
                reportId: data.reportId,
                appUserId: userData.user.appUserId,
            });
        }

        const report = reports.data[0];

        if (!report) {
            throw new Errors.NotFoundError('Report does not exist.', {
                action: 'CreateCommentAction',
                method: 'ValidateReport',
                reportId: data.reportId,
                appUserId: userData.user.appUserId,
            });
        }

        if (report.isSystem) {
            throw new Errors.Forbidden('System reports can not be commented.', {
                method: 'CreateCommentAction',
                customerId: data.customerId,
                reportId: data.reportId,
                appUserId: data.appUserId,
            });
        }

        const result = await this.reportService.PrepareReport(
            userData,
            report,
            users
        );

        return result;
    }

    private async ValidateVisualization(data: Comment): Promise<Visualization> {
        const visualization = await this.visualizationRepository.findByID(
            data.visualizationId
        );

        if (!visualization) {
            throw new Errors.NotFoundError('Visualization not found', {
                method: 'CreateCommentAction',
                visualizationId: data.visualizationId,
                customerId: data.customerId,
                userId: data.appUserId,
            });
        }

        if (
            visualization.customerId !== data.customerId ||
            visualization.tenantId !== data.tenantId ||
            visualization.appId !== data.appId
        ) {
            throw new Errors.ValidationError(
                'Visualization does not belong to chosen customerId, tenantId or appId',
                {
                    method: 'CreateCommentAction',
                    customerId: data.customerId,
                    visualizationId: data.visualizationId,
                    userId: data.appUserId,
                }
            );
        }
        return visualization;
    }
}
function getCommentType(data: Comment): CommentType {
    return data.reportId ? CommentType.Report : CommentType.Visualization;
}
