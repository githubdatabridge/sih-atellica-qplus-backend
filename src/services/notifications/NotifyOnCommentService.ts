import { Action, ActionType, Comment, NotificationType } from '../../entities';
import { Notification } from '../../entities';
import { injectable, injectAll, registry } from 'tsyringe';
import { QlikAuthData } from '../../lib/qlik-auth';
import { Errors } from '../../lib';
import { NotifyService } from './NotifyService';
import { OnCommentCreated } from './handlers/OnCommentCreated';
import { OnCommentReplied } from './handlers/OnCommentReplied';
import { OnCommentTagged } from './handlers/OnCommentTagged';
import { ActionRepository } from '../../repositories';
import { OnCommentCustomerCountChanged } from './handlers/OnCommentCustomerCountChanged';
import { OnCommentReportCountChanged } from './handlers/OnCommentReportCountChanged';
import { AppUser } from '../../entities/AppUser';
@registry([
    {
        token: 'IOnCommentHandle',
        useClass: OnCommentCreated,
    },
    {
        token: 'IOnCommentHandle',
        useClass: OnCommentTagged,
    },
    {
        token: 'IOnCommentHandle',
        useClass: OnCommentReplied,
    },
    {
        token: 'IOnCommentHandle',
        useClass: OnCommentCustomerCountChanged,
    },
    {
        token: 'IOnCommentHandle',
        useClass: OnCommentReportCountChanged,
    },
])
@injectable()
export class NotifyOnCommentService extends NotifyService {
    constructor(
        @injectAll('IOnCommentHandle') private allHandlers: IOnCommentHandle[],
        private actionRepository?: ActionRepository
    ) {
        super();
    }
    private handlers: IOnCommentHandle[] = [];

    private withPriorityRules: ActionType[] = [];
    private ensureNotification: NotificationType[] = [];

    defineHandlers(
        withPriorityRules: ActionType[],
        ensureNotification: NotificationType[]
    ) {
        this.withPriorityRules = withPriorityRules;
        this.ensureNotification = ensureNotification;

        this.checkDuplicateTypes();

        const allTypes = withPriorityRules
            .map((x) => x as string)
            .concat(ensureNotification);

        const resolvedHandler = [];
        allTypes.forEach((type) => {
            const handler = this.allHandlers.find((x) => x.type === type);

            if (!handler) {
                throw new Errors.InternalError(
                    `Failed to instantiated handler for ${type}`,
                    {
                        service: 'NotifyOnCommentServiceV2',
                        method: 'defineHandlers',
                        type,
                    }
                );
            }

            resolvedHandler.push(handler);
        });
        this.handlers = resolvedHandler;
    }

    private checkDuplicateTypes() {
        const withPriorityRulesDuplicates = this.withPriorityRules.filter(
            (v, i) => this.withPriorityRules.indexOf(v) != i
        );

        const ensureNotificationDuplicates = this.ensureNotification.filter(
            (v, i) => this.ensureNotification.indexOf(v) != i
        );

        let duplicate: boolean = false;

        this.withPriorityRules.forEach((w) => {
            let result = this.ensureNotification
                .map((x) => x as string)
                .includes(w as string);

            duplicate = result ? result : false;
        });

        if (
            duplicate ||
            withPriorityRulesDuplicates.length > 0 ||
            ensureNotificationDuplicates.length > 0
        ) {
            throw new Errors.InternalError(
                `$withPriorityRules or ensureNotification contains duplicate`,
                {
                    service: 'NotifyOnCommentServiceV2',
                    method: 'defineHandlers',
                }
            );
        }
    }

    async process(userData: QlikAuthData, comment: Comment, users: AppUser[]) {
        const actions: Action[] = [];
        const notifications: Notification[] = [];

        if (this.handlers.length === 0) {
            return;
        }

        for (const handler of this.handlers) {
            const result = await handler.handle(userData, comment, users);

            if (result.error) {
                this.handleError(result.error.error, result.error.message);
                continue;
            }

            result.actions.forEach((action) => {
                const alreadyAdded = actions.some(
                    (x) => x.appUserId === action.appUserId
                );
                if (
                    !alreadyAdded ||
                    this.ensureNotification.includes(
                        handler.type as NotificationType
                    )
                ) {
                    actions.push(action);
                }
            });

            result.notifications.forEach((notification) => {
                const alreadyAdded = notifications.some(
                    (x) => x.appUserIds[0] === notification.appUserIds[0]
                );
                if (
                    !alreadyAdded ||
                    this.ensureNotification.includes(
                        handler.type as NotificationType
                    )
                ) {
                    notifications.push(notification);
                }
            });
        }

        for (const notification of notifications) {
            await this.Send(notification);
        }

        await this.actionRepository.createMany(actions);

        this.withPriorityRules = [];
        this.ensureNotification = [];
    }
}

export interface IOnCommentHandle {
    readonly type: string;
    handle(
        userData: QlikAuthData,
        comment: Comment,
        users: AppUser[]
    ): Promise<{
        notifications: Notification[];
        actions: Action[];
        error: NotificationError;
    }>;
}

export interface NotificationError {
    error: object;
    message: string;
}
