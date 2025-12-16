import { KnexService } from '../services';
import { injectable, inject, delay } from 'tsyringe';
import {
    BaseRepository,
    PaginationParams,
    RepositoryResponse,
} from './BaseRepository';
import { Action } from '../entities';
import { CommentRepository } from './CommentRepository';

@injectable()
export class ActionRepository extends BaseRepository<Action> {
    constructor(
        private knexService?: KnexService,
        @inject(delay(() => CommentRepository))
        private commentRepository?: CommentRepository
    ) {
        super(knexService, 'actions');
    }

    async findByID(id: number): Promise<Action> {
        const action = await super.findByID(id, ['comment']);
        return action;
    }

    async getAll(
        where?: Action,
        include?: string[],
        filter?: string[][],
        pagination?: PaginationParams
    ): Promise<RepositoryResponse<Action[]>> {
        const actions = await super.getAll(where, null, filter, pagination);

        for (const action of actions.data) {
            const comments = await this.commentRepository.findAll(
                { id: action.commentId },
                ['qlik_state', 'visualization', 'report']
            );

            if (comments && comments.length && comments[0]) {
                action.comment = comments[0];
            }
        }

        return actions;
    }

    async getAllOnComment(
        appUserId: string,
        customerId: string,
        tenantId: string,
        appId: string,
        include?: string[],
        filter?: string[][],
        pagination?: PaginationParams,
        orderBy?: string[]
    ): Promise<RepositoryResponse<Action[]>> {
        let query = this.kS
            .get()
            .distinct()
            .select('a.*')
            .from({ a: 'actions' })
            .innerJoin({ c: 'comments' }, 'c.id', 'a.commentId')
            .leftJoin({ r: 'reports' }, 'c.reportId', 'r.id')
            .leftJoin({ u: 'users_reports' }, 'u.reportId', 'r.id')
            .leftJoin({ v: 'visualizations' }, 'c.visualizationId', 'v.id')
            .where({
                'a.customerId': customerId,
                'a.tenantId': tenantId,
                'a.appId': appId,
                'a.appUserId': appUserId,
            })
            .where((b) => {
                b.where((builder) => {
                    builder
                        .where({
                            'c.customerId': customerId,
                            'c.deletedAt': null,
                        })
                        .whereNot({ 'c.reportId': null })
                        .andWhere({
                            'u.appUserId': appUserId,
                            'u.deletedAt': null,
                        })
                        .orWhere({
                            'r.customerId': customerId,
                            'r.deletedAt': null,
                            'r.appUserId': appUserId,
                            'c.deletedAt': null,
                        });
                }).orWhere((builder) => {
                    builder
                        .where({
                            'c.customerId': customerId,
                            'c.deletedAt': null,
                            'v.deletedAt': null,
                        })
                        .whereNot({ 'c.visualizationId': null });
                });
            });

        if (orderBy && orderBy[0] && orderBy[1]) {
            const orderByWithPrefix = this.transformToPrefixedOrderBy(
                orderBy,
                'a'
            );
            query = query.orderBy(orderByWithPrefix[0], orderByWithPrefix[1]);
        }

        if (filter) {
            const filterWithPrefix = this.transformToPrefixedFilter(
                filter,
                'a',
                'c'
            );
            query = this.filter(query, filterWithPrefix);
        }

        const responseData: RepositoryResponse<Action[]> = {};

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

    async listAllOnComment(
        appUserId: string,
        customerId: string,
        tenantId: string,
        appId: string,
        filter?: string[][],
        pagination?: PaginationParams,
        orderBy?: string[]
    ): Promise<RepositoryResponse<Action[]>> {
        const actions = await this.getAllOnComment(
            appUserId,
            customerId,
            tenantId,
            appId,
            null,
            filter,
            pagination,
            orderBy
        );

        for (const action of actions.data) {
            const comments = await this.commentRepository.findAll(
                { id: action.commentId },
                ['qlik_state', 'visualization', 'report']
            );

            if (comments && comments.length && comments[0]) {
                action.comment = comments[0];
            }
        }
        return actions;
    }

    async getNotViewedByCommentIds(ids: number[]) {
        return await this.kS
            .get()(this.tableName)
            .where((builder) => {
                builder.whereIn('commentId', ids).andWhere({
                    viewedAt: null,
                });
            });
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
    ): Promise<RepositoryResponse<Action[]>> {
        let query = this.kS
            .get()
            .select('a.*')
            .distinct()
            .from({ a: 'actions' })
            .leftJoin({ r: 'reports' }, 'a.reportId', 'r.id')
            .leftJoin({ u: 'users_reports' }, 'u.reportId', 'r.id')
            .where({
                'a.customerId': customerId,
                'a.tenantId': tenantId,
                'a.appId': appId,
                'a.deletedAt': null,
                'a.appUserId': appUserId,
            })
            .whereNot({ 'a.reportId': null })
            .andWhere((builder) => {
                builder
                    .orWhere({
                        'u.appUserId': appUserId,
                        'u.deletedAt': null,
                    })
                    .orWhere({
                        'r.customerId': customerId,
                        'r.deletedAt': null,
                        'r.appUserId': appUserId,
                    })
                    .orWhere({
                        'r.customerId': customerId,
                        'r.deletedAt': null,
                        'r.isSystem': true,
                    });
            });

        if (orderBy && orderBy[0] && orderBy[1]) {
            const orderByWithPrefix = this.transformToPrefixedOrderBy(
                orderBy,
                'a'
            );
            query = query.orderBy(orderByWithPrefix[0], orderByWithPrefix[1]);
        }

        if (filter) {
            const filterWithPrefix = this.transformToPrefixedFilter(
                filter,
                'a',
                'c'
            );
            query = this.filter(query, filterWithPrefix);
        }

        const responseData: RepositoryResponse<Action[]> = {};

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
}
