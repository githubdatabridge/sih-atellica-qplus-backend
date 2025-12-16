import { BaseAction } from '../../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import {
    BookmarkItemRepository,
    BookmarkRepository,
    UserBookmarkRepository,
} from '../../../repositories';
import {
    KnexService,
    NotifyOnBookmarkService,
    UserService,
} from '../../../services';
import { QlikAuthData } from '../../../lib/qlik-auth';
import { Errors } from '../../../lib';
import { UserBookmark } from '../../../entities';
import { AppUser } from '../../../entities/AppUser';
import { Transaction } from 'knex/lib';
@injectable()
@autoInjectable()
export class ShareBookmarksAction extends BaseAction<AppUser[]> {
    constructor(
        private bookmarkRepository?: BookmarkRepository,
        private bookmarkItemRepository?: BookmarkItemRepository,
        private userBookmarkRepository?: UserBookmarkRepository,
        private userService?: UserService,
        private notifyService?: NotifyOnBookmarkService,
        private knexService?: KnexService
    ) {
        super();
    }

    async run(
        bookmarkId: number,
        listOfCandidatesForShare: string[],
        userData: QlikAuthData
    ): Promise<AppUser[]> {
        const bookmark = await this.getBookmark(bookmarkId);

        if (!bookmark) {
            throw new Errors.NotFoundError('Not found', {
                method: 'ShareBookmarks',
                appUserId: userData.user.appUserId,
                bookmarkId,
            });
        }

        const isShareAllowed = bookmark.appUserId === userData.user.appUserId;

        if (!isShareAllowed) {
            throw new Errors.Forbidden('Only owner can share bookmark.', {
                method: 'ShareBookmarks',
                id: bookmarkId,
                bookmarkAppUserId: bookmark.appUserId,
                appUserId: userData.user.appUserId,
            });
        }

        const isBookmarkSharable = bookmark.isPublic;

        if (!isBookmarkSharable) {
            throw new Errors.ValidationError('Bookmark is private.', {
                method: 'ShareBookmarks',
                appUserId: userData.user.appUserId,
                bookmarkId,
            });
        }

        const { validUsers, invalid } = await this.userService.validateUserList(
            userData,
            listOfCandidatesForShare
        );

        const invalidUserIds = invalid;

        const isOneOfUsersOwner = listOfCandidatesForShare.includes(
            bookmark.appUserId
        );
        if (isOneOfUsersOwner) {
            invalidUserIds.push(userData.user.appUserId);
        }

        const isUsersValid = invalidUserIds.length === 0;
        if (!isUsersValid) {
            throw new Errors.ValidationError(
                'Bookmark can not be shared with one or more given users.',
                {
                    method: 'ShareBookmarks',
                    appUserId: userData.user.appUserId,
                    invalidUserIds,
                    id: bookmarkId,
                }
            );
        }

        const bookmarkAlreadySharedUserIds = (
            await this.userBookmarkRepository.findAll({
                bookmarkId,
            })
        ).map((ub) => ub.appUserId);

        const listOfUsersForShare = listOfCandidatesForShare.filter(
            (x) => !bookmarkAlreadySharedUserIds.includes(x)
        );

        const userBookmarks: UserBookmark[] = listOfUsersForShare.map((x) => {
            return {
                bookmarkId,
                appUserId: x,
            };
        });

        const trx = (await this.knexService.transaction()) as Transaction;
        try {
            const result = await this.userBookmarkRepository.createMany(
                userBookmarks,
                trx
            );

            if (!result) {
                throw new Errors.InternalError(
                    'UserBookmarks creation failed',
                    {
                        method: 'ShareBookmarks',
                        bookmarkId,
                        customerId: userData.customerId,
                        appUserId: userData.user.appUserId,
                    }
                );
            }

            await trx.commit();

            await this.notifyService.NotifyOnShared(
                userData,
                bookmark,
                listOfUsersForShare
            );

            const response = validUsers;
            return response;
        } catch (error) {
            await trx.rollback(new Error('Condition caused rollback!'));
            throw error;
        }
    }

    private async getBookmark(bookmarkId: number) {
        const bookmark = await this.bookmarkRepository.findByID(bookmarkId);

        if (!bookmark) {
            return;
        }

        const bookmarkItems = await this.bookmarkItemRepository.findAll(
            {
                bookmarkId: bookmark.id,
            },
            ['qlik_state']
        );

        bookmark.bookmarkItems = bookmarkItems;
        return bookmark;
    }
}
