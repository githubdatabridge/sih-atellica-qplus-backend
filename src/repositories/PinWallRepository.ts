import { KnexService } from '../services';
import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';
import { PinWall } from '../entities';

@injectable()
export class PinWallRepository extends BaseRepository<PinWall> {
    constructor(private knexService?: KnexService) {
        super(knexService, 'pinwalls');
    }
}
