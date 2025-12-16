import { Transaction } from 'knex/lib';
import { injectable } from 'tsyringe';
import { ReportService } from '.';
import { Action, ActionKind, ActionType } from '../entities';
import { QlikAuthData } from '../lib/qlik-auth';
import { ActionRepository } from '../repositories';
import { CommentService } from './CommentService';
import { Errors } from '../lib';
import { AppUser } from '../entities/AppUser';
import { AssignUser, uniqueById } from '../lib/util';

@injectable()
export class ActionService {
    constructor(
        private actionRepository?: ActionRepository,
        private commentService?: CommentService,
        private reportService?: ReportService
    ) {}

    async CreateActionsOnShare(
        userData: QlikAuthData,
        reportId: number,
        appUserIds: string[],
        trx?: Transaction
    ): Promise<Action[]> {
        const data: Action[] = [];
        appUserIds.forEach((id) =>
            data.push({
                appUserId: id,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                reportId: reportId,
                type: ActionType.UserSharedReport,
            })
        );

        return await this.actionRepository.createMany(data, trx);
    }

    async CreateActionsOnSystemReportCreation(
        userData: QlikAuthData,
        appUserIds: string[],
        reportId: number,
        trx?: Transaction
    ): Promise<Action[]> {
        const data: Action[] = [];

        appUserIds.forEach((id) =>
            data.push({
                appUserId: id,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                reportId: reportId,
                type: ActionType.SystemReportCreated,
            })
        );

        return await this.actionRepository.createMany(data, trx);
    }

    async CreateActionOnComments(
        userData: QlikAuthData,
        commentId: number,
        appUserId: string,
        actionType: ActionType,
        trx?: Transaction
    ): Promise<Action> {
        return (
            await this.CreateActionsOnComments(
                userData,
                commentId,
                [appUserId],
                actionType,
                trx
            )
        )[0];
    }

    async CreateActionsOnComments(
        userData: QlikAuthData,
        commentId: number,
        appUserIds: string[],
        actionType: ActionType,
        trx?: Transaction
    ): Promise<Action[]> {
        const data: Action[] = appUserIds.map((appUserId) => {
            const action = {
                appUserId,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                commentId,
                type: actionType,
            };
            return action;
        });

        return await this.actionRepository.createMany(data, trx);
    }

    async PrepareActions(
        data: Action[],
        type: ActionKind,
        userData: QlikAuthData,
        users: AppUser[]
    ): Promise<Action[]> {
        switch (type) {
            case ActionKind.Report:
                return await this.PrepareActionsWithReport(
                    data,
                    userData,
                    users
                );
            case ActionKind.Comment:
                return await this.PrepareActionsWithComment(
                    data,
                    userData,
                    users
                );
            default:
                throw new Errors.ValidationError('Type of action not known.', {
                    method: 'PrepareActions',
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    appUserId: userData.user.appUserId,
                });
        }
    }

    private async PrepareActionsWithReport(
        data: Action[],
        userData,
        users: AppUser[]
    ): Promise<Action[]> {
        const actions: Action[] = [];
        let reports = data
            .filter((action) => action.report)
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

        data.forEach((action) => {
            actions.push({
                ...action,
                user: users.find((x) => x.appUserId === action.appUserId),
                report: reports.find((x) => x.id === action.reportId),
            });
        });

        return actions;
    }

    private async PrepareActionsWithComment(
        data: Action[],
        userData,
        users: AppUser[]
    ): Promise<Action[]> {
        const actions: Action[] = [];
        for (const action of data) {
            if (!action.comment) {
                return;
            }

            const result = await this.commentService.PrepareComment(
                action.comment,
                userData,
                users
            );

            actions.push({ ...action, comment: result });
        }

        actions.forEach((action) => {
            action.user = AssignUser(action.appUserId, users);
        });

        return actions;
    }

    async GetAllActionsOnComment(
        userData: QlikAuthData,
        users: AppUser[],
        filter: any[],
        pagination,
        orderBy?: string[]
    ) {
        const actions = await this.actionRepository.listAllOnComment(
            userData.user.appUserId,
            userData.customerId,
            userData.tenantId,
            userData.appId,
            filter,
            pagination,
            orderBy
        );

        actions.data = await this.PrepareActionsWithComment(
            actions.data,
            userData,
            users
        );

        return actions;
    }
}
