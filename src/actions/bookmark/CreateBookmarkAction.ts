import { BaseAction } from '../BaseAction';
import { injectable } from 'tsyringe';
import { Bookmark } from '../../entities';
import { BookmarkRepository } from '../../repositories';
import { Errors } from '../../lib';
import { BookmarkService } from '../../services';
import { QlikAuthData } from '../../lib/qlik-auth';

@injectable()
export class CreateBookmarkAction extends BaseAction<Bookmark> {
    constructor(
        private bookmarkRepository?: BookmarkRepository,
        private bookmarkService?: BookmarkService,
    ) {
        super();
    }

    async run(data: Bookmark, userData: QlikAuthData): Promise<Bookmark> {
        this.privatePublicValidation(data, userData);

        data.isPublic = data.bookmarkItems.some(
            (b) => b.qlikState.selections
        );

        data.appUserId = userData.user.appUserId;
        data.customerId = userData.customerId;
        data.tenantId = userData.tenantId;
        data.appId = userData.appId;

        const bookmarks = await this.bookmarkRepository.getAll({
            name: data.name,
            appUserId: userData.user.appUserId,
            tenantId: userData.tenantId,
            customerId: userData.customerId,
            appId: userData.appId,
        });

        if (!bookmarks || !bookmarks.data || !Array.isArray(bookmarks.data)) {
            throw new Errors.InternalError('Failed to retrieve bookmarks.', {
                action: 'CreateBookmark',
                name: data.name,
                appUserId: userData.user.appUserId,
            });
        }

        if (bookmarks.data.length !== 0) {
            throw new Errors.AlreadyExistsError(
                'Bookmark with same name already exists.',
                {
                    action: 'CreateBookmark',
                    name: data.name,
                    appUserId: userData.user.appUserId,
                }
            );
        }


        const result = await this.bookmarkService.create(data,userData);
        return result;
    }

    private privatePublicValidation(data: Bookmark, userData: QlikAuthData) {
        const isPrivate = data.bookmarkItems.some(
            (x) => x.qlikState.qsBookmarkId
        );

        const isPublic = data.bookmarkItems.some(
            (b) => b.qlikState.selections
        );

        if (isPrivate && isPublic) {
            throw new Errors.ValidationError(
                'Bookmarks and be private or public, not boat.',
                {
                    action: 'CreateBookmark',
                    name: data.name,
                    isPrivate,
                    isPublic,
                    appUserId: userData.user.appUserId,
                }
            );
        }
    }
}
