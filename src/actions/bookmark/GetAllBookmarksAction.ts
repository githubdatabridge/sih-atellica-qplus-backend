import { BaseAction } from '../BaseAction';
import { injectable } from 'tsyringe';
import { Bookmark } from '../../entities';
import { QlikAuthData } from '../../lib/qlik-auth';
import {
    PaginationParams,
    RepositoryResponse,
} from '../../repositories/BaseRepository';
import { BookmarkRepository, QlikStateRepository } from '../../repositories';
import { UserService } from '../../services';

@injectable()
export class GetAllBookmarksAction extends BaseAction<
    RepositoryResponse<Bookmark[]>
> {
    constructor(
        private bookmarkRepository: BookmarkRepository,
        private userService: UserService,
        private qlikStateRepository: QlikStateRepository
    ) {
        super();
    }

    async run(
        userData: QlikAuthData,
        filter?: string[][],
        search?: string[][],
        orderBy?: string[],
        pagination?: PaginationParams
    ): Promise<RepositoryResponse<Bookmark[]>> {
        const result = await this.bookmarkRepository.getAllBookmarks(
            userData.user.appUserId,
            {
                tenantId: userData.tenantId,
                customerId: userData.customerId,
                appId: userData.appId,
            },
            null,
            true,
            ['bookmark_items'],
            filter,
            search,
            orderBy,
            pagination
        );

        const qlikStateIds: number[] = [];

        for (const bookmark of result.data) {
            const ids = bookmark.bookmarkItems.map((x) => x.qlikStateId);
            qlikStateIds.push(...ids);
        }

        const qlikStates = await this.qlikStateRepository.findAllIn(
            qlikStateIds,
            'id'
        );

        const users = await this.userService.getAllUsersInfo(userData);

        for (const bookmark of result.data) {
            bookmark.bookmarkItems.forEach((x) => {
                x.qlikState = qlikStates.find((y) => y.id === x.qlikStateId);
            });
            bookmark.user = users.find(
                (x) => x.appUserId === bookmark.appUserId
            );
        }

        return result;
    }
}
