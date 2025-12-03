import { BaseAction } from '../../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import {
    BookmarkRepository,
    UserBookmarkRepository,
} from '../../../repositories';
import { QlikAuthData } from '../../../lib/qlik-auth';
import { Errors } from '../../../lib';
@injectable()
@autoInjectable()
export class UnshareBookmarkAction extends BaseAction<void> {
    constructor(
        private bookmarkRepository?: BookmarkRepository,
        private userBookmarkRepository?: UserBookmarkRepository
    ) {
        super();
    }

    async run(
        bookmarkId: number,
        listOfCandidatesForUnshare: string[],
        userData: QlikAuthData
    ): Promise<void> {
        const bookmark = await this.bookmarkRepository.findByID(bookmarkId);

        if (!bookmark) {
            throw new Errors.NotFoundError('Not found', {
                method: 'UnshareBookmarks',
                appUserId: userData.user.appUserId,
                bookmarkId,
            });
        }

        const shared = await this.userBookmarkRepository.findAll({
            bookmarkId,
        });

        if (shared.length === 0) {
            throw new Errors.NotFoundError('Not found', {
                method: 'UnshareBookmarks',
                sharedBookmarks: shared.length,
                appUserId: userData.user.appUserId,
                bookmarkId,
            });
        }

        const isUnshareAllowed = bookmark.appUserId === userData.user.appUserId;
        if (!isUnshareAllowed) {
            throw new Errors.Forbidden('Only owner can unshare bookmark.', {
                method: 'UnshareBookmarks',
                bookmarkId,
                bookmarkAppUserId: bookmark.appUserId,
                appUserId: userData.user.appUserId,
            });
        }

        const invalidUserIds = [];

        listOfCandidatesForUnshare.forEach((appUserId) => {
            if (!shared.some((sr) => sr.appUserId === appUserId)) {
                invalidUserIds.push(appUserId);
            }
        });

        const isOneOfUsersOwner = listOfCandidatesForUnshare.includes(
            bookmark.appUserId
        );
        if (isOneOfUsersOwner) {
            invalidUserIds.push(userData.user.appUserId);
        }

        const isUsersValid = invalidUserIds.length === 0;
        if (!isUsersValid) {
            throw new Errors.BadDataError(
                'Bookmark can not be unshared with one or more given user.',
                {
                    method: 'UnshareBookmarks',
                    appUserId: userData.user.appUserId,
                    invalidUserIds,
                    bookmarkId,
                }
            );
        }

        const bookmarkIdsToUnshare = shared
            .filter((sr) => listOfCandidatesForUnshare.includes(sr.appUserId))
            .map((x) => x.id);

        await this.userBookmarkRepository.deleteWhereIn(
            'id',
            bookmarkIdsToUnshare
        );
    }
}
