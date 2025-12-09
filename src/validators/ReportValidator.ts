import * as Joi from 'joi';
import { baseResponseValidator, restfulOperatorsValidator } from './BaseResponseValidator';
import * as DatasetValidator from './DatasetValidator';
import * as QlikStateValidator from './QlikStateValidator';
import * as AppUserValidator from './AppUserValidator';

const createRequest = Joi.object({
    content: Joi.object().required().label('ReportContentSchema'),
    title: Joi.string().required(),
    description: Joi.string().optional(),
    isFavourite: Joi.boolean().optional().default(false),
    visualizationType: Joi.string()
        .required(),
    isPinwallable: Joi.boolean().required(),
    datasetId: Joi.number().positive().required(),
    qlikState: QlikStateValidator.qlikStateCreate
        .optional()
        .allow(null)
        .label('QlikStateCreateRequest'),
    pageId: Joi.string().required(),
}).label('ReportRequest');

const updateRequest = Joi.object({
    content: Joi.object().required().label('ReportContentSchema'),
    title: Joi.string().required(),
    description: Joi.string().optional(),
    isFavourite: Joi.boolean().required(),
    visualizationType: Joi.string()
        .required(),
    isPinwallable: Joi.boolean().required(),
    datasetId: Joi.number().positive().required(),
    qlikState: QlikStateValidator.qlikStateCreate
        .allow(null)
        .label('QlikStateUpdate'),
}).label('ReportUpdate');

const patchRequest = Joi.object({
    content: Joi.object().optional().label('ReportContentSchema'),
    title: Joi.string().optional(),
    description: Joi.string().optional(),
    visualizationType: Joi.string()
        .optional(),
    isPinwallable: Joi.boolean().optional(),
    isFavourite: Joi.boolean().optional(),
    datasetId: Joi.number().positive().optional(),
    qlikState: QlikStateValidator.qlikStateCreate
        .optional()
        .allow(null)
        .label('QlikStateUpdate'),
})
    .min(1)
    .label('ReportPatch');

const reportBase = Joi.object({
    id: Joi.number().required(),
    appUserId: Joi.string().optional().allow(null),
    content: Joi.object().required().label('ReportContentSchema'),
    title: Joi.string().required(),
    description: Joi.string().optional().allow(null),
    tenantId: Joi.string().required(),
    visualizationType: Joi.string()
        .required(),
    appId: Joi.string().required(),
    customerId: Joi.string().required(),
    isSystem: Joi.boolean().required(),
    shared: Joi.boolean()
        .when('isSystem', { is: true, then: Joi.valid(false) })
        .required(),
    sharedWithOthers: Joi.boolean().optional(),
    isPinwallable: Joi.boolean()
        .required()
        .when('shared', { is: true, then: Joi.valid(false) }),
    isFavourite: Joi.boolean()
        .optional()
        .when('isSystem', { is: true, then: Joi.forbidden() })
        .when('shared', { is: true, then: Joi.forbidden() }),
    pageId: Joi.string().required(),
    user: AppUserValidator.response.required().allow(null),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required(),
    deletedAt: Joi.date().optional().allow(null),
    isCustomerReport: Joi.boolean().required(),
    templateId: Joi.number().allow(null),
}).label('ReportBaseSchema');

const report = reportBase
    .keys({
        dataset: DatasetValidator.dataset.required(),
        qlikState: QlikStateValidator.qlikState
            .optional()
            .allow(null)
            .label('QlikStateSchema'),
    })
    .label('ReportSchema');

const reportComment = reportBase
    .label('ReportForCommentSchema')
    .description('Schema is same as ReportBaseSchema');
const reportAction = reportBase
    .label('ReportForActionSchema')
    .description('Schema is same as ReportBaseSchema');

const reports = baseResponseValidator
    .keys({
        data: Joi.array()
            .items(report.label('ReportSchema'))
            .required()
            .empty()
            .label('ReportsMultipleResponse'),
        operators: restfulOperatorsValidator, 
    })
    .label('ReportsBaseResponse');

export {
    report,
    reports,
    createRequest,
    updateRequest,
    reportComment,
    reportAction,
    patchRequest,
};
