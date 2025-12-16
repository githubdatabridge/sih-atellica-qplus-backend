import * as qs from 'qs';
import { Errors } from '.';

export class RestfulOrderBy {
    private orderByField = 'orderBy';

    constructor(private defs: string[]) {}

    public parse(queryString) {
        const params = qs.parse(queryString);
        const orders = [];

        if (!params[this.orderByField]) {
            return orders;
        }

        const orderBy = params[this.orderByField];
        const props = Object.keys(orderBy);

        props.forEach((prop) => {
            for (const [rawOperator, _value] of Object.entries(orderBy[prop])) {
                const operator = checkOperator(rawOperator, this.orderByField);
                if (
                    this.defs &&
                    Array.isArray(this.defs) &&
                    this.defs.includes(prop)
                ) {
                    orders.push({ column: prop, order: operator });
                } else {
                    throw new Errors.ValidationError(
                        `${this.orderByField}[${prop}][${operator}] not allowed.`,
                        {}
                    );
                }
            }
        });

        if (orders.length > 1) {
            throw new Errors.ValidationError(
                `Not allowed more then one orderBy.`,
                {}
            );
        }

        const result = orders?.map((x) => [x.column, x.order])[0];
        return result ? result : [];
    }
}

function checkOperator(operator: string, orderByField: string): string {
    switch (operator) {
        case 'desc':
        case 'asc':
            return operator;
        case '0':
            return 'asc';
        default:
            throw new Errors.ValidationError(
                `${orderByField}[${operator}] invalid operator`,
                {}
            );
    }
}
