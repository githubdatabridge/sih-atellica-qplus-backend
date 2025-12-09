import * as Joi from 'joi';

const paginationValidator = Joi.object({
    total: Joi.number().optional(),
    lastPage: Joi.number().optional(),
    prevPage: Joi.number().optional().allow(null),
    nextPage: Joi.number().optional().allow(null),
    currentPage: Joi.number().optional(),
    perPage: Joi.number().optional(),
    from: Joi.number().optional(),
    to: Joi.number().optional(),
}).label('PaginationSchema');

const restfulOperatorsValidator = Joi.object({
    filter: Joi.object().optional().label('FilterCriteriaSchema'),
    search: Joi.object().optional().label('SearchCriteriaSchema'),
    orderBy: Joi.array().optional().label('OrderByArraySchema'),
}).label('RestfulOperatorsSchema');

const baseResponseValidator = Joi.object({
    pagination: paginationValidator.optional(),
    data: Joi.any(),
}).label('BaseResponse');

export { baseResponseValidator, restfulOperatorsValidator };
