import { KnexService, AppUserPreferencesService } from '../services';
import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';
import { AppUserPreferences } from '../entities/AppUserPreferences';
import { Transaction } from 'knex/lib';

@injectable()
export class AppUserPreferencesRepository extends BaseRepository<AppUserPreferences> {
    constructor(
        private knexService?: KnexService,
        private appUserPreferencesService?: AppUserPreferencesService
    ) {
        super(knexService, 'app_user_preferences');
    }

    async getAllWhere(where: AppUserPreferences, trx?: Transaction) {
        let data = await super.getAllWhere(where, trx);

        if (data && data.length) {
            data = data.map((d) => {
                return this.appUserPreferencesService.fixTypes(d);
            });
        }

        return data;
    }

    async create(data: AppUserPreferences, trx?: Transaction) {
        let d = await super.create(data, trx);

        return this.appUserPreferencesService.fixTypes(d);
    }

    async update(
        id: number,
        data: AppUserPreferences,
        returnRecord: boolean = false,
        trx?: Transaction
    ) {
        let d = await super.update(id, data, returnRecord, trx);

        if (returnRecord) {
            d = this.appUserPreferencesService.fixTypes(d);
        }

        return d;
    }
}
