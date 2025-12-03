import { KnexService } from '../services';
import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';
import { PinwallQlikState } from '../entities';

@injectable()
export class PinWallQlikStateRepository extends BaseRepository<PinwallQlikState> {
    constructor(private knexService?: KnexService) {
        super(knexService, 'pinwall_qlik_states');
    }
}
