import * as Joi from 'joi';
import {
    baseResponseValidator,
    restfulOperatorsValidator,
} from './BaseResponseValidator';
import * as CommentValidator from './CommentValidator';
import * as ReportValidator from './ReportValidator';
import * as AppUserValidator from './AppUserValidator';
import { ActionType } from '../entities';

const action = Joi.object({
    id: Joi.number().required(),
    appUserId: Joi.string().required().not(null),
    commentId: Joi.number().optional().allow(null),
    viewedAt: Joi.date().optional().allow(null),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required(),
    customerId: Joi.string().required().not(null),
    tenantId: Joi.string().required().not(null),
    appId: Joi.string().required().not(null),
    comment: CommentValidator.comment.optional(),
    reportId: Joi.number().optional().allow(null),
    report: ReportValidator.reportAction.optional(),
    user: AppUserValidator.response.optional(),
    type: Joi.string()
        .required()
        .valid(...Object.values(ActionType), 'NONE')
        .label('ActionTypeEnum'),
}).label('ActionSchema');

const createRequest = Joi.object({
    appUserId: Joi.string().required().not(null),
    commentId: Joi.number(),
    reportId: Joi.number(),
    type: Joi.string()
        .required()
        .valid(...Object.values(ActionType))
        .label('ActionTypeEnum'),
})
    .xor('commentId', 'reportId')
    .label('ActionCreateRequest');

const updateRequest = Joi.object({
    appUserId: Joi.string().optional(),
    commentId: Joi.number().optional().not(null),
    viewedAt: Joi.date().optional(),
}).label('ActionUpdateRequest');

const actions = baseResponseValidator
    .keys({
        data: Joi.array()
            .items(action)
            .label('ActionMultipleResponse')
            .required(),
        operators: restfulOperatorsValidator,
    })
    .label('ActionBaseResponse');

export { action, createRequest, actions, updateRequest };
