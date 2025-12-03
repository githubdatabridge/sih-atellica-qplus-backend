import { injectable } from 'tsyringe';
import { RestfulFilter } from '../lib';
import { RestfulOrderBy } from '../lib/RestfulOrderBy';
import { RestfulSearch } from '../lib/RestfulSearch';

export interface RestfulObject {
    filter?: any[];
    search?: any[];
    orderBy?: any[];
}

export interface RestfulOperators {
    filter?: any;
    search?: any;
    orderBy?: string[];
}

@injectable()
export class RestfulService {
    private _filterDefs = {};
    private _searchDefs = {};
    private _orderByDefs = [];

    private _orderByDefault;
    constructor() {}

    FilterDefs(value) {
        this._filterDefs = value;
        return this;
    }

    SearchDefs(value) {
        this._searchDefs = value;
        return this;
    }

    OrderByDefs(value) {
        this._orderByDefs = value;
        return this;
    }

    OrderByDefault(value: string, opt: 'desc' | 'asc' = 'desc') {
        if (!this._orderByDefs.includes(value)) {
            throw new Error('Invalid OrderByDefault value.');
        }
        this._orderByDefault = { value, opt };
        return this;
    }

    parse(query: unknown): RestfulObject {
        const result = {
            filter: new RestfulFilter(this._filterDefs).parse(query),
            search: new RestfulSearch(this._searchDefs).parse(query),
            orderBy: new RestfulOrderBy(this._orderByDefs).parse(query),
        };

        if (result.orderBy.length == 0 && this._orderByDefault) {
            result.orderBy.push(
                this._orderByDefault.value,
                this._orderByDefault.opt
            );
        }

        return result;
    }

    get operator(): RestfulObject {
        const result: RestfulOperators = {};

        if (this._filterDefs) {
            result['filter'] = this._filterDefs;
        }

        if (this._searchDefs) {
            result['search'] = this._searchDefs;
        }

        if (this._orderByDefs) {
            result['orderBy'] = this._orderByDefs;
        }

        return result;
    }
}
