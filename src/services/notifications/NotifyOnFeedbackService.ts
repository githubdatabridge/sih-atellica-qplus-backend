import { injectable } from 'tsyringe';
import { LogService, SocketService } from '..';
import { Feedback, NotificationType } from '../../entities';
import { QlikAuthData } from '../../lib/qlik-auth';
import { ActionService } from '../ActionService';
import { NotifyService } from './NotifyService';

@injectable()
export class NotifyOnFeedbackService extends NotifyService {
    constructor(private actionService?: ActionService) {
        super();
    }
    async NotifyOnFeedbackCreated(
        userData: QlikAuthData,
        requestData: Feedback
    ) {
        await this.Send({
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
            appUserIds: [requestData.appUserId],
            type: NotificationType.FeedbackCreated,
            data: {
                reviewedBy: userData.user.name,
                score: requestData.rating,
                comment: requestData.comment,
            },
        });
    }
}
