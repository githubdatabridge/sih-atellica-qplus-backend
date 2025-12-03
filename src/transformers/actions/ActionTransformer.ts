import { Action } from '../../entities';
import { transformReport } from '../comments/ReportTransformer';
import { transformComment } from '../comments/CommentTransformer';

const transformAction = (action: Action): Action => {
    const result: Action = {
        id: action.id,
        appUserId: action.appUserId,
        commentId: action.commentId,
        reportId: action.reportId,
        comment: action.comment,
        customerId: action.customerId,
        tenantId: action.tenantId,
        appId: action.appId,
        viewedAt: action.viewedAt,
        createdAt: action.createdAt,
        updatedAt: action.updatedAt,
        user: action.user,
        type: action.type,
    };
    if (action.report) {
        result.report = transformReport(action.report);
    }
    if (action.comment) {
        result.comment = transformComment(action.comment);
    }

    return result;
};

export { transformAction };
