import * as Joi from 'joi';
import { baseResponseValidator } from './BaseResponseValidator';
import * as QlikStateValidator from './QlikStateValidator';
import * as AppUserValidator from './AppUserValidator';
import * as ReportValidator from './ReportValidator';

const comment = Joi.object({
    id: Joi.number().required(),
    content: Joi.string().required(),
    appUserId: Joi.string().required(),
    qlikStateId: Joi.number().required().allow(null),
    scope: Joi.string().required().allow(null),
    commentId: Joi.number().optional().allow(null),
    reportId: Joi.number().optional().allow(null),
    visualizationId: Joi.number().optional().allow(null),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required(),
    deletedAt: Joi.date().optional().allow(null),
    comments: Joi.array()
        .items(Joi.object().label('CommentNestedSchema'))
        .optional()
        .label('CommentNestedArraySchema'),
    qlikState: QlikStateValidator.qlikState
        .optional()
        .allow(null)
        .allow({})
        .label('QlikStateSchema'),
    customerId: Joi.string().required(),
    tenantId: Joi.string().required(),
    appId: Joi.string().required(),
    user: AppUserValidator.response.optional(),
    visualization: Joi.object()
        .optional()
        .allow({})
        .label('CommentVisualizationSchema'),
    report: ReportValidator.reportComment.optional(),
    parentComment: Joi.object().optional().label('CommentParentSchema'),
    reactions: Joi.array()
        .items(Joi.object().label('ReactionSummarySchema'))
        .optional()
        .label('ReactionSummaryArraySchema'),
}).label('CommentResponse');

const createRequest = Joi.object({
    content: Joi.string().required(),
    scope: Joi.string().optional().default(null),
    commentId: Joi.number().optional().allow(null).not(0),
    visualizationId: Joi.number(),
    reportId: Joi.number(),
    qlikState: QlikStateValidator.qlikStateCreate
        .optional()
        .allow(null)
        .label('QlikStateCreateRequest'),
})
    .xor('visualizationId', 'reportId')
    .label('CommentRequest');

const updateRequest = Joi.object({
    content: Joi.string().optional(),
    scope: Joi.string().optional(),
    qlikState: QlikStateValidator.qlikStateCreate
        .optional()
        .allow(null)
        .label('QlikStateUpdateRequest'),
}).label('CommentUpdateRequest');

const comments = baseResponseValidator
    .keys({
        data: Joi.array()
            .items(comment)
            .label('CommentMultipleResponse')
            .required(),
    })
    .label('CommentBaseResponse');

export { comment, createRequest, comments, updateRequest };
