import { ActionService } from '../ActionService';
import { QlikAuthData } from '../../lib/qlik-auth';
import { Bookmark, Notification, NotificationType } from '../../entities';
import { NotifyService } from './NotifyService';
import { injectable } from 'tsyringe';

@injectable()
export class NotifyOnBookmarkService extends NotifyService {
    constructor(
        private actionService?: ActionService,
    ) {
        super();
    }

    async NotifyOnShared(
        userData: QlikAuthData,
        bookmark: Bookmark,
        appUserIds: string[]
    ) {
        if (!appUserIds || appUserIds.length === 0) {
            return;
        }

        try {
            // const actions = await this.actionService.CreateActionsOnShare(
            //     userData,
            //     report.id,
            //     appUserIds
            // );

            // if (!actions) {
            //     throw new Errors.InternalError('Actions creation failed', {
            //         method: 'NotifyWhenReportIsShared',
            //         reportId: report.id,
            //         customerId: userData.customerId,
            //         tenantId: userData.tenantId,
            //         appId: userData.appId,
            //         appUserId: userData.user.appUserId,
            //     });
            // }

            const notification = ComposeNotificationForShared(
                appUserIds,
                userData,
                bookmark
            );

            await this.Send(notification);
        } catch (e) {
            this.handleError(
                e,
                'Report Notification (Shared) cannot be issued'
            );
        }
    }
}

const ComposeNotificationForShared = (
    appUserIds: string[],
    userData: QlikAuthData,
    bookmark: Bookmark
): Notification => {
    return {
        type: NotificationType.UserSharedBookmark,
        appUserIds: appUserIds,
        customerId: userData.customerId,
        tenantId: userData.tenantId,
        appId: userData.appId,
        data: ComposeDataForNotify(userData, bookmark),
    };
};

const ComposeDataForNotify = (userData: QlikAuthData, bookmark: Bookmark): any => {
    return {
        initials: userData.user.name[0],
        firstName: userData.user.name,
        bookmarkId: bookmark.id,
        path: bookmark.path,
        name: bookmark.name,
        user: {
            name: userData.user.name,
            appUserId: userData.user.appUserId,
            email: userData.email,
        },
    };
};
