import * as Joi from 'joi';
import { baseResponseValidator } from './BaseResponseValidator';
import * as CommonValidator from './CommonValidator';

const visualization = Joi.object({
    id: Joi.number().required(),
    appId: Joi.string().required(),
    componentId: Joi.string().required().allow(null).default(null),
    pageId: Joi.string().required(),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required(),
    deletedAt: Joi.date().required().allow(null),
    comments: CommonValidator.arrayOfObjects.optional(),
    customerId: Joi.string().required(),
    tenantId: Joi.string().required(),
}).label('VisualizationSchema');

const createRequest = Joi.object({
    appId: Joi.string().required(),
    componentId: Joi.string().required(),
    pageId: Joi.string().required(),
}).label('VisualizationCreateRequest');

const visualizations = baseResponseValidator
    .keys({
        data: Joi.array()
            .items(visualization)
            .label('VisualizationMultipleResponse')
            .required(),
    })
    .label('VisualizationBaseResponse');
export { visualization, createRequest, visualizations };
