import * as qs from 'qs';
import { Errors } from '.';

export class RestfulSearch {
    private defs = null;
    private operators = ['eq', 'like'];
    private operatorMapping = {
        eq: '=',
        like: 'like',
    };

    private searchField = 'search';

    constructor(defs?: object) {
        this.setDefinitions(defs);
    }

    public parse(queryString) {
        const count = this.numberOfSearchesInQuery(queryString);
        if (count > 1) {
            throw new Error('RESTFUL Search: Only one Search query is allow.');
        }

        const params = qs.parse(queryString);

        if (!params[this.searchField]) {
            return;
        }

        const search = this.transform(params);
        const props = Object.keys(search);
        const where = [];

        props.forEach((prop) => {
            for (let [operator, value] of Object.entries(search[prop])) {
                if (operator === 'like') {
                    value = `%${value}%`;
                }

                if (value === 'null') {
                    value = null;
                }

                if (
                    !this.defs ||
                    (this.operators.includes(operator) && this.defs[prop])
                ) {
                    where.push([prop, this.operatorMapping[operator], value]);
                } else {
                    throw new Errors.ValidationError(
                        `${this.searchField}[${prop}] not allowed or invalid operator`,
                        {}
                    );
                }
            }
        });

        return where;
    }

    private numberOfSearchesInQuery(queryString: any) {
        return qs.stringify(queryString).split('search').length - 1;
    }

    private transform(params: any) {
        const search = params[this.searchField];
        const props = Object.keys(search);

        for (const prop of props) {
            if (!prop.includes(',')) {
                continue;
            }
            var adds = prop.split(',').map((x) => x.trim());
            adds.forEach((a) => {
                search[`${a}`] = search[prop];
            });

            delete search[prop];
        }
        return search;
    }

    private setDefinitions(defs: object) {
        if (!defs) {
            return;
        }

        this.defs = {};

        for (let def in defs) {
            if (!defs.hasOwnProperty(def)) {
                continue;
            }

            const prop = def;
            const operators = defs[def];

            if (!Array.isArray(operators)) {
                throw new Error(
                    'RESTFUL Search: Value must be an array of operators'
                );
            }

            this.defs[prop] = [];

            operators.forEach((op) => {
                if (this.operators.includes(op)) {
                    this.defs[prop].push(op);
                }
            });
        }
    }
}
