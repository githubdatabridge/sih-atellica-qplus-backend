import { injectable } from 'tsyringe';
import { ReportService } from '.';
import { Comment } from '../entities';
import { AppUser } from '../entities/AppUser';
import { QlikAuthData } from '../lib/qlik-auth';
import { AssignUser, checkIfUserIsAdmin, uniqueById } from '../lib/util';
import { CommentRepository } from '../repositories';
import { RepositoryResponse } from '../repositories/BaseRepository';

@injectable()
export class CommentService {
    constructor(
        private reportService?: ReportService,
        private commentRepository?: CommentRepository
    ) {}

    async AssignUserToComments(data: Comment[], users: AppUser[]) {
        const userIds = [];
        data.forEach((comment) => {
            if (userIds.includes(comment.appUserId)) {
                userIds.push(comment.appUserId);
            }

            if (!comment.comments && Array.isArray(comment.comments)) {
                comment.comments.forEach((subComment) => {
                    if (userIds.includes(subComment.appUserId)) {
                        userIds.push(subComment.appUserId);
                    }
                });
            }
        });
        data = this.addUsers(data, users);
        return data;
    }

    private addUsers(data: Comment[], users: AppUser[]) {
        data.forEach((x) => {
            x.user = AssignUser(x.appUserId, users);

            if (x.comments) {
                x.comments = this.addUsers(x.comments, users);
            }
        });
        return data;
    }

    async PrepareComment(
        data: Comment,
        userData: QlikAuthData,
        users: AppUser[]
    ): Promise<Comment> {
        const comment: Comment = { ...data };

        if (comment.report) {
            comment.report = await this.reportService.PrepareReport(
                userData,
                comment.report,
                users
            );
        }

        const result = (
            await this.AssignUserToComments([{ ...comment }], users)
        )[0];

        return result;
    }

    async PrepareComments(
        data: Comment[],
        userData: QlikAuthData,
        users: AppUser[]
    ): Promise<Comment[]> {
        const comments: Comment[] = [];
        let reports = data
            .filter((comment) => comment.report)
            .map((x) => {
                return { ...x.report };
            });

        reports = uniqueById(reports);

        if (reports.length !== 0) {
            reports = await this.reportService.PrepareReports(
                userData,
                reports,
                users
            );
        }

        data.forEach((comment) => {
            if (comment.reportId) {
                comments.push({
                    ...comment,
                    report: reports.find((x) => x.id === comment.reportId),
                });
            } else if (comment.visualizationId) {
                comments.push({ ...comment });
            } else {
                return;
            }
        });

        return await this.AssignUserToComments(comments, users);
    }

    async getAllCommentsForVisualizations(
        userData: QlikAuthData,
        filter: any[],
        pagination?: any
    ) {
        const comments = await this.commentRepository.listAll(
            {
                reportId: null,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
            },
            null,
            filter,
            pagination
        );
        return comments;
    }

    async getAllCommentsForReports(
        userData: QlikAuthData,
        filter: any[],
        pagination?: any
    ) {
        const isAdmin = checkIfUserIsAdmin(userData);
        let comments: RepositoryResponse<Comment[]>;
        if (isAdmin) {
            comments = await this.commentRepository.listAll(
                {
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    visualizationId: null,
                },
                null,
                filter,
                pagination
            );
        } else {
            comments = await this.commentRepository.listAllFilteredByReports(
                userData.user.appUserId,
                userData.customerId,
                userData.tenantId,
                userData.appId,
                filter,
                pagination
            );
        }

        return comments;
    }
}
