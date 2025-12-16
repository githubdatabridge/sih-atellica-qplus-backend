import * as qs from 'qs';
import { Errors } from '.';

export class RestfulFilter {
    private defs = null;
    private operators = ['eq', 'gt', 'lt', 'lte', 'gte', 'not', 'like'];
    private operatorMapping = {
        eq: '=',
        gt: '>',
        lt: '<',
        lte: '<=',
        gte: '>=',
        not: '<>',
        like: 'like',
    };

    private filterField = 'filter';

    constructor(defs?: object) {
        this.setDefinitions(defs);
    }

    public parse(queryString) {
        const params = qs.parse(queryString);

        if (!params[this.filterField]) {
            return;
        }

        const filter = params[this.filterField];
        const props = Object.keys(filter);

        const where = [];

        props.forEach((prop) => {
            for (const [operator, rawValue] of Object.entries(filter[prop])) {
                let value = rawValue;
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
                        `${this.filterField}[${prop}] not allowed or invalid operator`,
                        {}
                    );
                }
            }
        });

        return where;
    }

    private setDefinitions(defs: object) {
        if (!defs) {
            return;
        }

        this.defs = {};

        for (const def in defs) {
            if (!defs.hasOwnProperty(def)) {
                continue;
            }

            const prop = def;
            const operators = defs[def];

            if (!Array.isArray(operators)) {
                throw new Error(
                    'RESTFUL Filter: Value must be an array of operators'
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
