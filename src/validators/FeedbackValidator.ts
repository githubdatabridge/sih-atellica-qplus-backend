import * as Joi from 'joi';

const response = Joi.object({
    id: Joi.number().required(),
    customerId: Joi.string().required(),
    tenantId: Joi.string().required(),
    appId: Joi.string().required(),
    appUserId: Joi.string().required(),
    rating: Joi.number().min(1).max(5),
    comment: Joi.string().required().allow(''),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required(),
    deletedAt: Joi.date().required().allow(null),
}).label('FeedbackResponse');

const create = Joi.object({
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().required().allow(''),
}).label('FeedbackCreateRequest');

const update = Joi.object({
    rating: Joi.number().min(1).max(5).optional(),
    comment: Joi.string().optional().allow(''),
}).label('FeedbackUpdateRequest');

const feedbacks = Joi.array().items(response).label('FeedbacksArrayResponse');

export { response, create, update, feedbacks };
