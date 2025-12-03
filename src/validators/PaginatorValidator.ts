import * as Joi from 'joi';

export const paginatorQueryValidator = Joi.object({
    page: Joi.number().optional().default(1),
    perPage: Joi.number().optional().default(10),
})
    .optional()
    .label('PaginatorQueryRequest');
