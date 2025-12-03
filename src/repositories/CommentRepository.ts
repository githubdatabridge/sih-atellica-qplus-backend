import { KnexService } from '../services';
import { injectable, inject, delay } from 'tsyringe';
import {
    BaseRepository,
    RepositoryResponse,
    PaginationParams,
} from './BaseRepository';
import { Comment } from '../entities';
import { ActionRepository } from '.';
import { ReactionRepository } from './ReactionRepository';

@injectable()
export class CommentRepository extends BaseRepository<Comment> {
    constructor(
        private knexService?: KnexService,
        @inject(delay(() => CommentRepository))
        private actionRepository?: ActionRepository,
        private reactionRepository?: ReactionRepository
    ) {
        super(knexService, 'comments');
    }

    async findByID(id: number): Promise<Comment> {
        const comment = await super.findByID(id, [
            'comments',
            'qlik_state',
            'visualization',
            'report',
        ]);

        return comment;
    }

    async getAll(
        where?: Comment,
        include?: string[],
        filter?: string[][],
        pagination?: PaginationParams,
        orderBy?: string[]
    ): Promise<RepositoryResponse<Comment[]>> {
        const comments = await super.getAll(
            where,
            include,
            filter,
            pagination,
            ['createdAt', 'desc']
        );

        return comments;
    }

    async listAllFilteredByReports(
        appUserId: string,
        customerId: string,
        tenantId: string,
        appId: string,
        filter?: string[][],
        pagination?: PaginationParams,
        includeChild: boolean = false
    ) {
        let f = [['commentId', 'eq', null]];
        if (includeChild) {
            f = [];
        }

        if (filter && filter.length) {
            f = f.concat(filter);
        }

        const comments = await this.getAllByFilteringReports(
            appUserId,
            customerId,
            tenantId,
            appId,
            ['comments', 'qlik_state', 'visualization', 'report'],
            f,
            pagination
        );

        return comments;
    }

    async getAllByFilteringReports(
        appUserId: string,
        customerId: string,
        tenantId: string,
        appId: string,
        include?: string[],
        filter?: string[][],
        pagination?: PaginationParams,
        orderBy?: string[]
    ): Promise<RepositoryResponse<Comment[]>> {
        let query = this.kS
            .get()
            .select('c.*')
            .distinct()
            .from({ c: 'comments' })
            .leftJoin({ r: 'reports' }, 'c.reportId', 'r.id')
            .leftJoin({ u: 'users_reports' }, 'u.reportId', 'r.id')
            .where({
                'c.customerId': customerId,
                'c.tenantId': tenantId,
                'c.appId': appId,
                'c.deletedAt': null,
            })
            .whereNot({ 'c.reportId': null })
            .andWhere({
                'u.appUserId': appUserId,
                'u.customerId': customerId,
                'u.tenantId': tenantId,
                'u.appId': appId,
                'u.deletedAt': null,
            })
            .orWhere({
                'r.customerId': customerId,
                'r.tenantId': tenantId,
                'r.appId': appId,
                'r.deletedAt': null,
                'r.appUserId': appUserId,
                'c.deletedAt': null,
            });

        if (orderBy && orderBy[0] && orderBy[1]) {
            const orderByWithPrefix = this.transformToPrefixedOrderBy(
                orderBy,
                'c'
            );
            query = query.orderBy(orderByWithPrefix[0], orderByWithPrefix[1]);
        }

        if (filter) {
            const filterWithPrefix = this.transformToPrefixedFilter(
                filter,
                'c'
            );
            query = this.filter(query, filterWithPrefix);
        }

        let responseData: RepositoryResponse<Comment[]> = {};

        let data = query.paginate((pagination || {}) as any);

        responseData.pagination = (await data).pagination;
        responseData.data = (await data).data;

        responseData.data = await this.include(
            responseData.data,
            include,
            orderBy
        );

        return responseData;
    }

    async listAll(
        where?: Comment,
        include?: string[],
        filter?: string[][],
        pagination?: PaginationParams,
        includeChild: boolean = false
    ): Promise<RepositoryResponse<Comment[]>> {
        let f = [['commentId', 'eq', null]];
        if (includeChild) {
            f = [];
        }

        if (filter && filter.length) {
            f = f.concat(filter);
        }

        const comments = await this.getAll(
            where,
            ['comments', 'qlik_state', 'visualization', 'report'],
            f,
            pagination
        );

        return comments;
    }

    async getAllWhereIncludeChild(
        data: Comment,
        includeChild: boolean = false
    ): Promise<RepositoryResponse<Comment[]>> {
        const comments = await this.listAll(
            data,
            ['comments', 'qlik_state', 'visualization'],
            undefined,
            null,
            includeChild
        );

        return comments;
    }

    async getCount(data: Comment) {
        const res = await this.get()
            .count()
            .where(Object.assign(data, { deletedAt: null }));

        if (typeof res[0]['count'] == 'string') {
            return parseInt(res[0]['count'] as string);
        } else if (typeof res[0]['count'] == 'number') {
            return res[0]['count'];
        } else {
            return;
        }
    }

    async getUnreadByAction(
        appUserId: string,
        scope: string,
        customerId: string,
        tenantId: string,
        appId: string
    ) {
        const comments = await this.getAll(
            { appUserId, scope, customerId, tenantId, appId },
            ['action']
        );

        if (!comments.data || !comments.data.length) {
            return [];
        }

        const actions = await this.actionRepository.getNotViewedByCommentIds(
            comments.data.map((c) => c.id)
        );

        return comments.data.filter((c) => {
            return actions.find((a) => a.commentId === c.id);
        });
    }

    async updateWhere(
        where: Comment,
        data: Comment,
        returnRecord: boolean = false
    ): Promise<Comment> {
        data['updatedAt'] = new Date();

        const result = await this.kS
            .get()(this.tableName)
            .update(data)
            .where(where);

        if (result && returnRecord) {
            const data = await this.listAll(where, null, null, null, true);
            return data.data[0];
        }
    }

    async assignReactionToComments(comments: Comment[], appUserId: string) {
        const assignReactionsToComment = async (comment) => {
            const reactions = await this.reactionRepository.getAll({
                commentId: comment.id,
                appUserId: appUserId,
                scope: comment.scope,
                customerId: comment.customerId,
                tenantId: comment.tenantId,
                appId: comment.appId,
            });

            if (reactions.data && reactions.data.length) {
                comment.reaction = reactions.data[0];
            }

            return comment;
        };

        for (let topComment of comments) {
            topComment = await assignReactionsToComment(topComment);

            if (!topComment.comments) {
                continue;
            }

            for (let childComment of topComment.comments) {
                childComment = await assignReactionsToComment(childComment);
            }
        }

        return comments;
    }
}
