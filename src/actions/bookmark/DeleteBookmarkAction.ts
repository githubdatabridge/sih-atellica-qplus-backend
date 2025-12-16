import { BaseAction } from '../BaseAction';
import { injectable } from 'tsyringe';
import { QlikAuthData } from '../../lib/qlik-auth';
import { BookmarkRepository } from '../../repositories';
import { Errors } from '../../lib';
import { BookmarkService } from '../../services';

@injectable()
export class DeleteBookmarkAction extends BaseAction<void> {
    constructor(
        private bookmarkRepository: BookmarkRepository,
        private bookmarkService?: BookmarkService
    ) {
        super();
    }

    async run(userData: QlikAuthData, id: number): Promise<void> {
        const result = await this.bookmarkRepository.getAll(
            {
                id,
                tenantId: userData.tenantId,
                customerId: userData.customerId,
                appId: userData.appId,
            },
            ['bookmark_items']
        );

        if (!result || !result.data || !Array.isArray(result.data)) {
            throw new Errors.InternalError('Failed to retrieve bookmarks.', {
                action: 'DeleteBookmark',
                bookmarkId: id,
                appUserId: userData.user.appUserId,
            });
        }

        if (result.data.length === 0) {
            throw new Errors.NotFoundError('Not Found.', {
                action: 'DeleteBookmark',
                bookmarkId: id,
                appUserId: userData.user.appUserId,
                tenantId: userData.tenantId,
                customerId: userData.customerId,
            });
        }

        if (result.data[0].appUserId !== userData.user.appUserId) {
            throw new Errors.Forbidden('Forbidden', {
                action: 'DeleteBookmark',
                bookmarkId: result.data[0].id,
                appUserId: userData.user.appUserId,
                tenantId: userData.tenantId,
                customerId: userData.customerId,
            });
        }

        await this.bookmarkService.delete(result.data[0]);
    }
}
