import { KnexService } from '../services';
import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';
import { BookmarkItem } from '../entities';

@injectable()
export class BookmarkItemRepository extends BaseRepository<BookmarkItem> {
    constructor(private knexService?: KnexService) {
        super(knexService, 'bookmark_items');
    }
}
