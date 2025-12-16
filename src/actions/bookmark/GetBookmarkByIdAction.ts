import { BaseAction } from '../BaseAction';
import { injectable } from 'tsyringe';
import { Bookmark } from '../../entities';
import { QlikAuthData } from '../../lib/qlik-auth';
import { Errors } from '../../lib';
import { BookmarkService } from '../../services/BookmarkService';

@injectable()
export class GetBookmarkByIdAction extends BaseAction<Bookmark> {
    constructor(private bookmarkService?: BookmarkService) {
        super();
    }

    async run(userData: QlikAuthData, id: number): Promise<Bookmark> {
        const result = await this.bookmarkService.loadById(userData, id);

        if (!result) {
            throw new Errors.NotFoundError('Not Found.', {
                action: 'GetBookmarkById',
                bookmarkId: id,
                appUserId: userData.user.appUserId,
                tenantId: userData.tenantId,
                customerId: userData.customerId,
            });
        }

        return result;
    }
}
