import { BaseAction } from '../../BaseAction';
import { injectable } from 'tsyringe';
import { BookmarkRepository } from '../../../repositories';
import { Errors } from '../../../lib';
import { UserService } from '../../../services';
import { QlikAuthData } from '../../../lib/qlik-auth';
import { AppUser } from '../../../entities/AppUser';

@injectable()
export class GetUsersWithClaimOnBookmarkAction extends BaseAction<AppUser[]> {
    constructor(
        private bookmarkRepository?: BookmarkRepository,
        private userService?: UserService
    ) {
        super();
    }

    async run(bookmarkId: number, userData: QlikAuthData): Promise<AppUser[]> {
        const bookmark = await this.bookmarkRepository.findByID(bookmarkId);

        if (!bookmark) {
            throw new Errors.NotFoundError('Not found', {
                method: 'GetUsersWithClaimOnBookmark',
                appUserId: userData.user.appUserId,
                bookmarkId,
            });
        }
        const appUserIdsWhoCanSeeBookmark =
            await this.bookmarkRepository.GetAllFollowersOfBookmarks(
                bookmark,
                bookmarkId
            );

        const isGetAllowed = appUserIdsWhoCanSeeBookmark.includes(
            userData.user.appUserId
        );

        if (!isGetAllowed) {
            throw new Errors.NotFoundError('Not found', {
                method: 'GetUsersWithClaimOnBookmark',
                id: bookmarkId,
                bookmarkAppUserId: bookmark.appUserId,
                appUserId: userData.user.appUserId,
            });
        }

        const result = await this.userService.getUsersInfo(
            appUserIdsWhoCanSeeBookmark.filter((x) => x !== bookmark.appUserId),
            userData
        );

        return result;
    }
}
