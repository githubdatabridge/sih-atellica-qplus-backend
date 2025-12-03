import { BaseAction } from '../../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { UserReportRepository } from '../../../repositories';
import { ReportRepository } from '../../../repositories/ReportRepository';
import {
    KnexService,
    NotifyOnReportService,
    ReportService,
    UserService,
} from '../../../services';
import { QlikAuthData } from '../../../lib/qlik-auth';
import { Errors } from '../../../lib';
import { UserReport } from '../../../entities';
import { AppUser } from '../../../entities/AppUser';
import { checkIfUserIsAdmin } from '../../../lib/util';
import { ActionService } from '../../../services/ActionService';
import { Transaction } from 'knex/lib';
@injectable()
@autoInjectable()
export class ShareReportsAction extends BaseAction<AppUser[]> {
    constructor(
        private reportRepository?: ReportRepository,
        private userReportRepository?: UserReportRepository,
        private userService?: UserService,
        private actionService?: ActionService,
        private notifyService?: NotifyOnReportService,
        private knexService?: KnexService
    ) {
        super();
    }

    async run(
        reportId: number,
        listOfCandidatesForShare: string[],
        userData: QlikAuthData
    ): Promise<AppUser[]> {
        const report = await this.reportRepository.findByID(reportId);
        if (
            !report ||
            userData.customerId !== report.customerId ||
            userData.tenantId !== report.tenantId ||
            userData.appId !== report.appId
        ) {
            throw new Errors.NotFoundError('Not found', {
                method: 'ShareReport',
                appUserId: userData.user.appUserId,
                id: reportId,
            });
        }

        const isShareAllowed =
            report.appUserId === userData.user.appUserId ||
            checkIfUserIsAdmin(userData);
        if (!isShareAllowed) {
            throw new Errors.NotFoundError('Not found', {
                method: 'ShareReport',
                id: reportId,
                reportAppUserId: report.appUserId,
                appUserId: userData.user.appUserId,
            });
        }

        const isSystem = report.isSystem;
        if (isSystem) {
            throw new Errors.ValidationError(
                'System report can not be shared.',
                {
                    method: 'ShareReport',
                    appUserId: userData.user.appUserId,
                    isSystem: isSystem,
                    id: reportId,
                }
            );
        }

        const { validUsers, invalid } = await this.userService.validateUserList(
            userData,
            listOfCandidatesForShare
        );

        const invalidUserIds = invalid;

        const isOneOfUsersOwner = listOfCandidatesForShare.includes(
            report.appUserId
        );
        if (isOneOfUsersOwner) {
            invalidUserIds.push(userData.user.appUserId);
        }

        const isUsersValid = invalidUserIds.length === 0;
        if (!isUsersValid) {
            throw new Errors.ValidationError(
                'Report can not be shared with one or more given users.',
                {
                    method: 'ShareReport',
                    appUserId: userData.user.appUserId,
                    invalidUserIds,
                    id: reportId,
                }
            );
        }

        const reportAlreadySharedUserIds = (
            await this.userReportRepository.findAll({
                reportId,
            })
        ).map((ur) => ur.appUserId);

        const listOfUsersForShare = listOfCandidatesForShare.filter(
            (x) => !reportAlreadySharedUserIds.includes(x)
        );

        const userReports: UserReport[] = listOfUsersForShare.map((x) => {
            return {
                reportId,
                appUserId: x,
                customerId: report.customerId,
                tenantId: report.tenantId,
                appId: report.appId,
            };
        });

        const trx = (await this.knexService.transaction()) as Transaction;
        try {
            const result = await this.userReportRepository.createMany(
                userReports,
                trx
            );

            if (!result) {
                throw new Errors.InternalError('UserReports creation failed', {
                    method: 'ShareReport',
                    reportId,
                    customerId: userData.customerId,
                    appUserId: userData.user.appUserId,
                });
            }

            await trx.commit();

            await this.notifyService.NotifyWhenReportIsShared(
                userData,
                report,
                listOfUsersForShare
            );

            const response = validUsers;
            return response;
        } catch (error) {
            await trx.rollback(new Error('Condition caused rollback!'));
            throw error;
        }
    }
}
