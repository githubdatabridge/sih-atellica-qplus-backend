import { KnexService } from '../services';
import { injectable } from 'tsyringe';
import {
    BaseRepository,
    RepositoryResponse,
    PaginationParams,
} from './BaseRepository';
import { Report } from '../entities';
import { Transaction } from 'knex/lib';

@injectable()
export class ReportRepository extends BaseRepository<Report> {
    constructor(private knexService?: KnexService) {
        super(knexService, 'reports');
    }

    async GetAllFollowersOfReport(
        customerId: string,
        tenantId: string,
        appId: string,
        reportId: number,
        skipAppUserIds?: string[]
    ): Promise<string[]> {
        let query = this.kS
            .get()
            .select(
                'r.appUserId as r_appUserId',
                'u.appUserId as u_appUserId',
                'u.deletedAt'
            )
            .distinct()
            .from({ r: 'reports' })
            .leftJoin({ u: 'users_reports' }, 'u.reportId', 'r.id')
            .where({
                'r.customerId': customerId,
                'r.tenantId': tenantId,
                'r.appId': appId,
                'r.id': reportId,
                'r.deletedAt': null,
            });

        const data = (await query) as Array<{
            r_appUserId: string;
            u_appUserId: string;
            deletedAt: Date;
        }>;

        if (!data) {
            return;
        }

        let result: string[] = [];

        data.forEach((obj) => {
            if (obj.r_appUserId) {
                result.push(obj.r_appUserId);
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

    async getAllReports(
        options: {
            withTemplate: boolean;
            withShared: boolean;
            withPersonal: boolean;
        },
        appUserId: string,
        customerId: string,
        tenantId: string,
        appId: string,
        include?: string[],
        where?: Report,
        filter?: string[][],
        search?: string[][],
        orderBy?: string[],
        pagination?: PaginationParams
    ): Promise<RepositoryResponse<Report[]>> {
        if (!options) {
            options = {
                withTemplate: true,
                withShared: true,
                withPersonal: true,
            };
        }

        if (
            !options.withTemplate &&
            !options.withShared &&
            !options.withPersonal
        ) {
            return this.EmptyPaginationData(pagination);
        }

        let query = this.kS
            .get()
            .select('r.*')
            .distinct()
            .from({ r: 'reports' })
            .leftJoin({ u: 'users_reports' }, 'u.reportId', 'r.id')
            .where({
                'r.customerId': customerId,
                'r.tenantId': tenantId,
                'r.appId': appId,
                'r.deletedAt': null,
            })
            .andWhere((builder) => {
                if (options.withPersonal) {
                    builder.where({
                        'r.appUserId': appUserId,
                        'r.isSystem': false,
                    });
                }

                if (options.withTemplate) {
                    builder.orWhere({
                        'r.isSystem': true,
                    });
                }

                if (options.withShared) {
                    builder.orWhere({
                        'u.appUserId': appUserId,
                        'u.customerId': customerId,
                        'u.tenantId': tenantId,
                        'u.appId': appId,
                        'u.deletedAt': null,
                    });
                }
            });

        if (orderBy && orderBy[0] && orderBy[1]) {
            const orderByWithPrefix = this.transformToPrefixedOrderBy(
                orderBy,
                'r'
            );
            query = query.orderBy(orderByWithPrefix[0], orderByWithPrefix[1]);
        }

        if (where) {
            const whereWithPrefix = this.transformToPrefixedWhere(where, 'r');
            query = query.andWhere(whereWithPrefix);
        }

        if (filter) {
            const filterWithPrefix = this.transformToPrefixedFilter(
                filter,
                'r'
            );
            query = this.filter(query, filterWithPrefix);
        }

        if (search) {
            const searchWithPrefix = this.transformToPrefixedFilter(
                search,
                'r'
            );
            query = this.search(query, searchWithPrefix);
        }

        let responseData: RepositoryResponse<Report[]> = {};

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

    private EmptyPaginationData(
        paginationParams: PaginationParams
    ): RepositoryResponse<Report[]> {
        return {
            data: [],
            pagination: {
                total: 0,
                lastPage: 0,
                currentPage: paginationParams.currentPage,
                perPage: paginationParams.perPage,
                from: 0,
                to: 0,
            },
        };
    }

    async updateReportsVisualizationType(
        ids: number[],
        visualizationType: string,
        trx?: Transaction
    ): Promise<void> {
        const data: Report = { visualizationType, updatedAt: new Date() };

        const query = this.kS.get()(this.tableName);

        if (trx) {
            query.transacting(trx);
        }

        var result = await query.update(data).whereIn('id', ids);
    }

    async findAllInFieldWhere(
        field: string,
        values: any[],
        where?: Report,
        trx?: Transaction
    ): Promise<Report[]> {
        const query = this.kS.get()(this.tableName);

        if (trx) {
            query.transacting(trx);
        }

        const data = await query.whereIn(field, values).where(
            Object.assign(
                {
                    deletedAt: null,
                },
                where
            )
        );
        return data;
    }

    async findAllInAndInclude(
        ids: number[] | string[],
        field: string = 'id',
        include: string[] = [],
        where?: object,
        trx?: Transaction
    ): Promise<Report[]> {
        const data = await this.findAllIn(ids, field, where, trx);

        if (include.length === 0) {
            return data;
        }

        return await this.include(data, include, null, trx);
    }
}
