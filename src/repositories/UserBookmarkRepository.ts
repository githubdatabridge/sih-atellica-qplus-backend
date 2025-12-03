import { KnexService } from '../services';
import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';
import { UserBookmark } from '../entities';

@injectable()
export class UserBookmarkRepository extends BaseRepository<UserBookmark> {
    constructor(private knexService?: KnexService) {
        super(knexService, 'users_bookmarks');
    }
}
