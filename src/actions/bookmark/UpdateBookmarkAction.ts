import { BaseAction } from '../BaseAction';
import { injectable } from 'tsyringe';
import { Bookmark } from '../../entities';
import { QlikAuthData } from '../../lib/qlik-auth';
import { BookmarkRepository } from '../../repositories';
import { Errors } from '../../lib';
import { BookmarkService } from '../../services';

@injectable()
export class UpdateBookmarkAction extends BaseAction<Bookmark> {
    constructor(
        private bookmarkRepository: BookmarkRepository,
        private bookmarkService?: BookmarkService
    ) {
        super();
    }

    async run(data: Bookmark, userData: QlikAuthData): Promise<Bookmark> {
        const result = await this.bookmarkRepository.getAll(
            {
                tenantId: userData.tenantId,
                customerId: userData.customerId,
                appId: userData.appId,
            }
        );

        if (!result || !result.data || !Array.isArray(result.data)) {
            throw new Errors.InternalError('Failed to retrieve bookmarks.', {
                action: 'UpdateBookmark',
                bookmarkId: data.id,
                appUserId: userData.user.appUserId,
            });
        }

        const bookmarkDb = result.data.filter((x) => x.id === data.id)[0];

        if (!bookmarkDb) {
            throw new Errors.NotFoundError('Not Found.', {
                action: 'UpdateBookmark',
                bookmarkId: data.id,
                appUserId: userData.user.appUserId,
                tenantId: userData.tenantId,
                customerId: userData.customerId,
            });
        }

        if (bookmarkDb.appUserId !== userData.user.appUserId) {
            throw new Errors.Forbidden('Forbidden', {
                action: 'UpdateBookmark',
                bookmarkId: data.id,
                appUserId: userData.user.appUserId,
                tenantId: userData.tenantId,
                customerId: userData.customerId,
            });
        }

        const isNameAlreadyTaken = result.data
            .filter((b) => b.id !== data.id)
            .some((x) => x.name === data.name);

        if (isNameAlreadyTaken) {
            throw new Errors.AlreadyExistsError(
                'Bookmark with same name already exists.',
                {
                    action: 'UpdateBookmark',
                    id: data.id,
                    requested_name: data.name,
                    current_name: result.data[0].name,
                    appUserId: userData.user.appUserId,
                }
            );
        }
        const bookmark = await this.bookmarkService.loadById(userData, data.id);

        this.privatePublicValidation(bookmark, data, userData);

        const response = await this.bookmarkService.update(
            bookmark,
            data,
            userData
        );

        return response;
    }

    private privatePublicValidation(
        existing: Bookmark,
        data: Bookmark,
        userData: QlikAuthData
    ) {
        const isPrivate = data.bookmarkItems.some(
            (x) => x.qlikState.qsBookmarkId
        );

        const isPublic = data.bookmarkItems.some((b) => b.qlikState.selections);

        if (!existing.isPublic && isPublic) {
            throw new Errors.ValidationError(
                'Bookmarks can not be updated to public one.',
                {
                    action: 'UpdateBookmark',
                    name: data.name,
                    appUserId: userData.user.appUserId,
                }
            );
        }

        if (isPrivate && isPublic) {
            throw new Errors.ValidationError(
                'Bookmarks can be private or public, not boat.',
                {
                    action: 'UpdateBookmark',
                    name: data.name,
                    isPrivate,
                    isPublic,
                    appUserId: userData.user.appUserId,
                }
            );
        }
    }
}
