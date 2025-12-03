import { KnexService } from '../services';
import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';
import { UserReport } from '../entities';

@injectable()
export class UserReportRepository extends BaseRepository<UserReport> {
    constructor(private knexService?: KnexService) {
        super(knexService, 'users_reports');
    }

    async GetSharedReportsByAppUserId(appUserID: string) {
        const where = {
            appUserId: appUserID,
        };

        const sharedReportIds = (await this.getAllWhere(where)).map(
            (x) => x.reportId
        );
        return sharedReportIds;
    }
}
