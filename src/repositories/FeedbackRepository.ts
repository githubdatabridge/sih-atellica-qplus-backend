import { KnexService } from '../services';
import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';
import { Feedback } from '../entities';

@injectable()
export class FeedbackRepository extends BaseRepository<Feedback> {
    constructor(private knexService?: KnexService) {
        super(knexService, 'feedbacks');
    }
}
