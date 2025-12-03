import { UserService } from '..';
import { ActionService } from '../ActionService';
import { QlikAuthData } from '../../lib/qlik-auth';
import { Notification, NotificationType, Report } from '../../entities';
import { Errors } from '../../lib';
import { NotifyService } from './NotifyService';
import { injectable } from 'tsyringe';

@injectable()
export class NotifyOnReportService extends NotifyService {
    constructor(
        private actionService?: ActionService,
        private userService?: UserService
    ) {
        super();
    }

    async NotifyWhenReportIsShared(
        userData: QlikAuthData,
        report: Report,
        appUserIds: string[]
    ) {
        if (!appUserIds || appUserIds.length === 0) {
            return;
        }

        try {
            const actions = await this.actionService.CreateActionsOnShare(
                userData,
                report.id,
                appUserIds
            );

            if (!actions) {
                throw new Errors.InternalError('Actions creation failed', {
                    method: 'NotifyWhenReportIsShared',
                    reportId: report.id,
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    appUserId: userData.user.appUserId,
                });
            }

            const notification = ComposeNotificationForSharedReport(
                actions.map((x) => x.appUserId),
                userData,
                report
            );

            await this.Send(notification);
        } catch (e) {
            this.handleError(
                e,
                'Report Notification (Shared) cannot be issued'
            );
        }
    }

    async NotifyWhenSystemReportCreated(
        userData: QlikAuthData,
        report: Report
    ) {
        try {
            const appUserIds = (
                await this.userService.getAllUsersInfo(userData)
            )
                .filter((usr) => usr.appUserId !== userData.user.appUserId)
                .map((x) => x.appUserId);

            const actions =
                await this.actionService.CreateActionsOnSystemReportCreation(
                    userData,
                    appUserIds,
                    report.id
                );

            if (!actions) {
                throw new Errors.InternalError('Actions creation failed', {
                    method: 'NotifyWhenSystemReportCreated',
                    reportId: report.id,
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    appUserId: userData.user.appUserId,
                });
            }

            const notification = ComposeNotificationForSystemReport(
                userData,
                report
            );

            this.Send(notification);
        } catch (e) {
            this.handleError(
                e,
                'Report Notification (System Report) cannot be issued'
            );
        }
    }
}

const ComposeNotificationForSystemReport = (
    userData: QlikAuthData,
    result: Report
): Notification => {
    return {
        type: NotificationType.SystemReportCreated,
        customerId: userData.customerId,
        tenantId: userData.tenantId,
        appId: userData.appId,
        data: ComposeDataForNotify(userData, result),
    };
};

const ComposeNotificationForSharedReport = (
    appUserIds: string[],
    userData: QlikAuthData,
    result: Report
): Notification => {
    return {
        type: NotificationType.UserSharedReport,
        appUserIds: appUserIds,
        customerId: userData.customerId,
        tenantId: userData.tenantId,
        appId: userData.appId,
        data: ComposeDataForNotify(userData, result),
    };
};

const ComposeDataForNotify = (userData: QlikAuthData, result: Report): any => {
    return {
        initials: userData.user.name[0],
        firstName: userData.user.name,
        reportId: result.id,
        pageId: result.pageId,
        title: result.title,
        visualizationType: result.visualizationType,
        system: result.isSystem,
        user: {
            name: userData.user.name,
            appUserId: userData.user.appUserId,
            email: userData.email,
        },
    };
};
