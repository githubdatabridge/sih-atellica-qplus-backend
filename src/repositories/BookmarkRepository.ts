import { KnexService } from '../services';
import { injectable } from 'tsyringe';
import {
    BaseRepository,
    PaginationParams,
    RepositoryResponse,
} from './BaseRepository';
import { Bookmark, UserMetadata } from '../entities';

@injectable()
export class BookmarkRepository extends BaseRepository<Bookmark> {
    constructor(private knexService?: KnexService) {
        super(knexService, 'bookmarks');
    }

    async getAllBookmarks(
        appUserId: string,
        assignment: UserMetadata,
        where?: Bookmark,
        withShared: boolean = true,
        include?: string[],
        filter?: string[][],
        search?: string[][],
        orderBy?: string[],
        pagination?: PaginationParams
    ): Promise<RepositoryResponse<Bookmark[]>> {
        let query = this.kS
            .get()
            .select('b.*')
            .distinct()
            .from({ b: 'bookmarks' })
            .leftJoin({ u: 'users_bookmarks' }, 'u.bookmarkId', 'b.id')
            .where({
                'b.customerId': assignment.customerId,
                'b.tenantId': assignment.tenantId,
                'b.appId': assignment.appId,
                'b.deletedAt': null,
            })
            .andWhere((builder) => {
                builder.where({
                    'u.appUserId': appUserId,
                    'u.deletedAt': null,
                });
                if (withShared) {
                    builder.orWhere({
                        'b.appUserId': appUserId,
                    });
                }
            });

        if (where) {
            const whereWithPrefix = this.transformToPrefixedWhere(where, 'b');
            query = query.andWhere(whereWithPrefix);
        }

        if (orderBy && orderBy[0] && orderBy[1]) {
            const orderByWithPrefix = this.transformToPrefixedOrderBy(
                orderBy,
                'b'
            );
            query = query.orderBy(orderByWithPrefix[0], orderByWithPrefix[1]);
        }

        if (filter) {
            const filterWithPrefix = this.transformToPrefixedFilter(
                filter,
                'b'
            );
            query = this.filter(query, filterWithPrefix);
        }

        if (search) {
            const searchWithPrefix = this.transformToPrefixedFilter(
                search,
                'b'
            );
            query = this.search(query, searchWithPrefix);
        }

        const responseData: RepositoryResponse<Bookmark[]> = {};

        const data = query.paginate((pagination || {}) as any);

        responseData.pagination = (await data).pagination;
        responseData.data = (await data).data;

        responseData.data = await this.include(
            responseData.data,
            include,
            orderBy
        );

        return responseData;
    }

    async GetAllFollowersOfBookmarks(
        assignment: UserMetadata,
        bookmarkId: number,
        skipAppUserIds?: string[]
    ): Promise<string[]> {
        const query = this.kS
            .get()
            .select(
                'b.appUserId as b_appUserId',
                'u.appUserId as u_appUserId',
                'u.deletedAt'
            )
            .distinct()
            .from({ b: 'bookmarks' })
            .leftJoin({ u: 'users_bookmarks' }, 'u.bookmarkId', 'b.id')
            .where({
                'b.customerId': assignment.customerId,
                'b.tenantId': assignment.tenantId,
                'b.appId': assignment.appId,
                'b.id': bookmarkId,
                'b.deletedAt': null,
            });

        const data = (await query) as Array<{
            b_appUserId: string;
            u_appUserId: string;
            deletedAt: Date;
        }>;

        if (!data) {
            return;
        }

        let result: string[] = [];

        data.forEach((obj) => {
            if (obj.b_appUserId) {
                result.push(obj.b_appUserId);
            }
            if (obj.u_appUserId && !obj.deletedAt) {
                result.push(obj.u_appUserId);
            }
        });

        //Filter unique appUserIds
        result = [...new Set(result)];

        if (skipAppUserIds && Array.isArray(skipAppUserIds)) {
            result = result.filter((x) => !skipAppUserIds.includes(x));
        }
        return result;
    }
}
