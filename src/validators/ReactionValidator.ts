import * as Joi from 'joi';
import { baseResponseValidator } from './BaseResponseValidator';
import * as QlikStateValidator from './QlikStateValidator';
import * as AppUserValidator from './AppUserValidator';

const reaction = Joi.object({
    id: Joi.number().required(),
    score: Joi.number().required(),
    appUserId: Joi.string().required(),
    scope: Joi.string().required().allow(null),
    commentId: Joi.number().optional().allow(null),
    visualizationId: Joi.number().optional().allow(null),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required(),
    deletedAt: Joi.date().required().allow(null),
    qlikState: QlikStateValidator.qlikState
        .optional()
        .allow(null)
        .allow({})
        .label('QlikStateSchema'),
    qlikStateId: Joi.number().required().allow(null),
    customerId: Joi.string().required(),
    tenantId: Joi.string().required(),
    appId: Joi.string().required(),
    user: AppUserValidator.response.optional(),
}).label('ReactionSchema');

const createRequest = Joi.object({
    score: Joi.number().required().not(null),
    scope: Joi.string().required().not(null),
    commentId: Joi.number().optional().default(null),
    visualizationId: Joi.number().optional().default(null),
    qlikState: QlikStateValidator.qlikStateCreate
        .optional()
        .allow(null)
        .label('QlikStateCreateRequest'),
}).label('ReactionCreateRequest');

const updateRequest = Joi.object({
    score: Joi.number().optional(),
    scope: Joi.string().optional(),
    qlikState: QlikStateValidator.qlikStateCreate
        .optional()
        .allow(null)
        .label('QlikStateUpdateRequest'),
}).label('ReactionUpdateRequest');

const reactions = baseResponseValidator
    .keys({
        data: Joi.array()
            .items(reaction)
            .label('ReactionMultipleResponse')
            .required(),
    })
    .label('ReactionBaseResponse');

export { reaction, createRequest, reactions, updateRequest };
