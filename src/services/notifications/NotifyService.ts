import { autoInjectable } from 'tsyringe';
import { LogService, SocketService } from '..';
import { NotificationType, Notification } from '../../entities';
import * as Errors from '../../lib/errors';
import { BaseError } from '../../lib/errors';

@autoInjectable()
export class NotifyService {
    constructor(
        private socketService?: SocketService,
        private loggerService?: LogService
    ) {}

    protected async Send(data: Notification): Promise<void> {
        const t = NotificationType;

        try {
            switch (data.type) {
                case t.UserCreatedReactionOnVisualization:
                case t.UserCreatedReactionOnComment:
                case t.UserTaggedInComment:
                case t.UserCommentReplied:
                case t.UserQlikDataLoaded:
                case t.UserSharedReport:
                case t.UserCommentCreated:
                case t.UserSharedBookmark:
                    await this.socketService.notifyUser(data);
                    break;
                case t.CustomerReactionCountChanged:
                case t.CustomerCommentCountChanged:
                case t.SystemReportCreated:
                    await this.socketService.notifyAllUsersInCustomer(data);
                    break;
                case t.ReportCommentCountChanged:
                    await this.socketService.notifyUser(data);
                    break;
                case t.CustomerQlikDataLoaded:
                    await this.socketService.notifyAllUsersInCustomer(
                        data,
                        data.appUserIds[0]
                    );
                case t.FeedbackCreated:
                    break;
                default:
                    throw new Errors.ValidationError(
                        'Notification type not supported',
                        {
                            action: 'NotifyService',
                        }
                    );
            }
        } catch (e) {
            throw new Errors.FailedDependency('Notify failed', {
                action: 'NotifyService',
            });
        }
    }

    protected handleError(e: any, message: string) {
        this.loggerService.get().error(message);
        const baseError = e as BaseError;
        this.loggerService.get().error(
            `
                    {${baseError.name}}
                    Timestamp: ${new Date().toISOString()}
                    Error: ${baseError.name || 'Error'}
                    Message: ${baseError.message}
                    CustomData: ${JSON.stringify(baseError.customData)}
                    Stack: ${baseError.stack}
                    {/${baseError.name}}
                `
        );
    }
}
