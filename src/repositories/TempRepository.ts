import { KnexService } from '../services';
import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';
import { Tenant } from '../entities';

@injectable()
export class TempRepository extends BaseRepository<{
    id?: number;
    data?: { array: Tenant[] };
}> {
    constructor(private knexService?: KnexService) {
        super(knexService, 'temp_tenants');
    }
}
