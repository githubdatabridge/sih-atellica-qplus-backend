import { KnexService } from '../services';
import * as pluralize from 'pluralize';
import { camelCase } from 'change-case';
import * as Errors from '../lib/errors';
import { QueryBuilder, Transaction } from 'knex/lib';

export interface PaginationParams {
    perPage: number;
    currentPage: number;
    isFromStart?: boolean;
    isLengthAware?: boolean;
}

export interface PaginationResponse {
    total?: number;
    lastPage?: number;
    currentPage: number;
    perPage: number;
    from: number;
    to: number;
}

export interface RepositoryResponse<T = any> {
    data?: T;
    pagination?: PaginationResponse;
}

export class BaseRepository<T> {
    constructor(protected kS: KnexService, protected tableName: string) {}

    public get(tableName?: string) {
        if (!tableName) {
            tableName = this.tableName;
        }

        return this.kS.get()(tableName);
    }
    async findAllIn(
        ids: number[] | string[],
        field: string = 'id',
        where?: object,
        trx?: Transaction
    ): Promise<T[]> {
        return trx
            ? await this.kS
                  .get()(this.tableName)
                  .transacting(trx)
                  .whereIn(field, ids)
                  .where(
                      Object.assign(
                          {
                              deletedAt: null,
                          },
                          where
                      )
                  )
            : await this.kS
                  .get()(this.tableName)
                  .whereIn(field, ids)
                  .where(
                      Object.assign(
                          {
                              deletedAt: null,
                          },
                          where
                      )
                  );
    }

    async findAll(
        where: T,
        include?: string[],
        trx?: Transaction
    ): Promise<T[]> {
        let data = trx
            ? await this.kS
                  .get()(this.tableName)
                  .transacting(trx)
                  .where(Object.assign({ deletedAt: null }, where))
            : await this.kS
                  .get()(this.tableName)
                  .where(Object.assign({ deletedAt: null }, where));

        data = await this.include(data, include, [], trx);

        return data;
    }

    async findAllInField(
        field: string,
        values: any[],
        trx?: Transaction
    ): Promise<T[]> {
        const data = trx
            ? this.kS
                  .get()(this.tableName)
                  .transacting(trx)
                  .whereIn(field, values)
                  .where({ deletedAt: null })
            : this.kS
                  .get()(this.tableName)
                  .whereIn(field, values)
                  .where({ deletedAt: null });
        return data;
    }

    async findByID(
        id: number,
        include?: string[],
        trx?: Transaction
    ): Promise<T> {
        let data = trx
            ? await this.kS
                  .get()(this.tableName)
                  .transacting(trx)
                  .where({ id, deletedAt: null })
            : await this.kS
                  .get()(this.tableName)
                  .where({ id, deletedAt: null });

        if (data.length && data[0]) {
            data = trx
                ? await this.include(data, include, [])
                : await this.include(data, include, [], trx);
            return data[0];
        }

        throw new Errors.NotFoundError('Not Found', { method: 'findByID' });
    }

    async create(data: T, trx?: Transaction): Promise<T> {
        const result = trx
            ? await this.kS
                  .get()(this.tableName)
                  .transacting(trx)
                  .insert(data)
                  .returning('*')
            : await this.kS.get()(this.tableName).insert(data).returning('*');
        return result[0];
    }

    async createMany(data: T[], trx?: Transaction): Promise<T[]> {
        if (!data || !data.length) {
            return [];
        }
        const result = trx
            ? await this.kS
                  .get()(this.tableName)
                  .transacting(trx)
                  .insert(data)
                  .returning('*')
            : await this.kS.get()(this.tableName).insert(data).returning('*');

        return result;
    }

    protected async include(
        data: any[],
        include?: string[],
        orderBy?: string[],
        trx?: Transaction
    ) {
        if (!include || !include.length) {
            return data;
        }

        for (const d of data) {
            for (const i of include) {
                const where = {};
                let data;
                const camelCased = camelCase(i);

                if (pluralize.isPlural(i)) {
                    if (!d[camelCased]) {
                        d[camelCased] = [];
                    }

                    where[`${pluralize.singular(this.tableName)}Id`] = d.id;
                    let query = trx
                        ? this.get(i)
                              .transacting(trx)
                              .where(Object.assign({ deletedAt: null }, where))
                        : this.get(i).where(
                              Object.assign({ deletedAt: null }, where)
                          );

                    if (orderBy && orderBy[0] && orderBy[1]) {
                        query = trx
                            ? query
                                  .transacting(trx)
                                  .orderBy(orderBy[0], orderBy[1])
                            : query.orderBy(orderBy[0], orderBy[1]);
                    }

                    data = await query;
                } else {
                    if (!d[camelCased]) {
                        d[camelCased] = null;
                    }

                    data = trx
                        ? await this.kS
                              .get()(pluralize.plural(i))
                              .transacting(trx)
                              .where({
                                  id: d[`${camelCased}Id`],
                                  deletedAt: null,
                              })
                        : await this.kS
                              .get()(pluralize.plural(i))
                              .where({
                                  id: d[`${camelCased}Id`],
                                  deletedAt: null,
                              });
                }

                if (data && data.length) {
                    if (pluralize.isPlural(i)) {
                        d[camelCased] = data;
                    } else {
                        d[camelCased] = data[0];
                    }
                }
            }
        }

        return data;
    }

    protected filter(query: QueryBuilder, where, trx?: Transaction) {
        if (where && Array.isArray(where)) {
            where.forEach((w) => {
                if (!w[0] || !w[1]) {
                    return;
                }

                if (w[2] === null && w[1] === '<>') {
                    trx
                        ? query.transacting(trx).whereNotNull(w[0])
                        : query.whereNotNull(w[0]);
                } else if (w[2] === null) {
                    trx
                        ? query.transacting(trx).whereNull(w[0])
                        : query.whereNull(w[0]);
                } else {
                    trx
                        ? query.transacting(trx).where(w[0], w[1], w[2])
                        : query.where(w[0], w[1], w[2]);
                }
            });
        }

        return query;
    }

    protected search(query: QueryBuilder, where, trx?: Transaction) {
        let q: QueryBuilder = trx ? query.transacting(trx) : query;
        if (where && Array.isArray(where)) {
            q.where((builder) => {
                where.forEach((w) => {
                    if (!w[0] || !w[1]) {
                        return;
                    }

                    builder.orWhere(w[0], w[1], w[2]);
                });
            });
        }

        return query;
    }

    async getAllWhere(
        where: object,
        trx?: Transaction,
        filter?: string[][]
    ): Promise<T[]> {
        let query;
        query = trx
            ? this.kS
                  .get()(this.tableName)
                  .transacting(trx)
                  .where(
                      Object.assign(
                          {
                              deletedAt: null,
                          },
                          where
                      )
                  )
            : this.kS
                  .get()(this.tableName)
                  .where(
                      Object.assign(
                          {
                              deletedAt: null,
                          },
                          where
                      )
                  );

        if (filter) {
            query = this.filter(query, filter, trx);
        }

        return await query;
    }

    async getAll(
        where?: T,
        include?: string[],
        filter?: string[][],

        pagination?: PaginationParams,
        orderBy?: string[],
        trx?: Transaction,
        search?: string[][]
    ): Promise<RepositoryResponse<T[]>> {
        let query = trx
            ? this.kS
                  .get()(this.tableName)
                  .transacting(trx)
                  .where({ deletedAt: null })
            : this.kS.get()(this.tableName).where({ deletedAt: null });

        if (orderBy && orderBy[0] && orderBy[1]) {
            query = trx
                ? query.transacting(trx).orderBy(orderBy[0], orderBy[1])
                : query.orderBy(orderBy[0], orderBy[1]);
        }

        if (where) {
            query = trx
                ? query.transacting(trx).andWhere(where)
                : query.andWhere(where);
        }

        if (filter) {
            query = this.filter(query, filter, trx);
        }

        if (search) {
            query = this.search(query, search, trx);
        }

        let responseData: RepositoryResponse<T[]> = {};

        let data = (await trx)
            ? query.transacting(trx).paginate((pagination || {}) as any)
            : query.paginate((pagination || {}) as any);

        responseData.pagination = (await data).pagination;
        responseData.data = (await data).data;

        responseData.data = await this.include(
            responseData.data,
            include,
            orderBy,
            trx
        );

        return responseData;
    }

    async update(
        id: number,
        data: object,
        returnRecord: boolean = false,
        trx?: Transaction
    ): Promise<T> {
        data['updatedAt'] = new Date();

        const result = trx
            ? await this.kS
                  .get()(this.tableName)
                  .transacting(trx)
                  .update(data)
                  .where({ id })
            : await this.kS.get()(this.tableName).update(data).where({ id });

        if (result && returnRecord) {
            return trx ? this.findByID(id, [], trx) : this.findByID(id);
        }
    }
    async updateWhere(
        where: T,
        data: T,
        returnRecord: boolean = false,
        trx?: Transaction
    ): Promise<T> {
        data['updatedAt'] = new Date();

        const result = trx
            ? await this.kS
                  .get()(this.tableName)
                  .transacting(trx)
                  .update(data)
                  .where(where)
            : await this.kS.get()(this.tableName).update(data).where(where);

        if (result && returnRecord) {
            const data = trx
                ? await this.getAll(where, [], [], null, [], trx)
                : await this.getAll(where);
            return data.data[0];
        }

        if (!result) {
            throw new Errors.NotFoundError('Not Found', {
                method: 'BaseRepository',
            });
        }
    }

    async deleteWhere(where: object, trx?: Transaction): Promise<boolean> {
        const res = trx
            ? await this.kS
                  .get()(this.tableName)
                  .transacting(trx)
                  .update({ deletedAt: new Date() })
                  .where(where)
            : await this.kS
                  .get()(this.tableName)
                  .update({ deletedAt: new Date() })
                  .where(where);

        return !!res;
    }

    async deleteWhereIn(field: string, ids: number[], trx?: Transaction) {
        const res = trx
            ? await this.kS
                  .get()(this.tableName)
                  .transacting(trx)
                  .whereIn(field, ids)
                  .update({ deletedAt: new Date() })
            : await this.kS
                  .get()(this.tableName)
                  .whereIn(field, ids)
                  .update({ deletedAt: new Date() });

        return !!res;
    }

    protected transformToPrefixedOrderBy(orderBy: string[], prefix: string) {
        if (!orderBy || !Array.isArray(orderBy) || !orderBy[0]) {
            return;
        }
        const result = [...orderBy];
        result[0] = prefix + '.' + result[0];
        return result;
    }

    protected transformToPrefixedWhere(where: object, prefix?: string) {
        if (!where) {
            return;
        }
        const props = Object.keys(where);

        var result = {};

        props.forEach((prop) => {
            const newProp = prefix ? prefix + '.' + prop : prop;
            result[newProp] = where[prop];
        });
        return result;
    }

    protected transformToPrefixedFilter(
        filter: string[][],
        prefix: string,
        subPrefix?: string
    ): string[][] {
        const result: string[][] = [];

        filter.forEach((w) => {
            const withPrefix: string[] = [...w];
            if (w && Array.isArray(w) && w[0]) {
                if (w[0][0] !== '_') {
                    withPrefix[0] = prefix + '.' + withPrefix[0];
                }
                if (w[0][0] === '_' && subPrefix) {
                    withPrefix[0] = subPrefix + withPrefix[0].replace('_', '.');
                }
            }
            result.push(withPrefix);
        });
        return result;
    }
}
