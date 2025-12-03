import { Comment, Dataset, Report } from '../../entities';
import { transformQlikState } from '../reports/QlikStateTransformer';
import { transformReport } from './ReportTransformer';

const transformComment = (comment: Comment): Comment => {
    const result: Comment = {
        id: comment.id,
        content: comment.content,
        appUserId: comment.appUserId,
        qlikState: comment.qlikState,
        qlikStateId: comment.qlikStateId,
        commentId: comment.commentId,
        visualizationId: comment.visualizationId,
        reportId: comment.reportId,
        scope: comment.scope,
        user: comment.user,
        comments: comment.comments,
        customerId: comment.customerId,
        tenantId: comment.tenantId,
        appId: comment.appId,
        reactions: comment.reactions,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
    };
    if (comment.qlikState) {
        result.qlikState = transformQlikState(comment.qlikState);
    }
    if (comment.report) {
        result.report = transformReport(comment.report);
    }
    if (comment.visualization) {
        result.visualization = comment.visualization;
    }
    if (comment.parentComment) {
        result.parentComment = transformComment(comment.parentComment);
    }

    return result;
};

export { transformComment };
