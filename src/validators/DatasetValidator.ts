import * as Joi from 'joi';
import { VisualizationType } from '../entities';
import {
    baseResponseValidator,
    restfulOperatorsValidator,
} from './BaseResponseValidator';
import * as CommonValidator from './CommonValidator';

const QItem = Joi.object({
    qId: Joi.string().required().not(null),
    label: Joi.string().optional().allow(null),
    meta: Joi.object().optional().allow(null).label('QItemMetaSchema'),
}).label('QItemSchema');

const ChartTypeItem = Joi.object({
    isBaseChart: Joi.bool().required(),
    name: Joi.string().when('isBaseChart', [
        {
            is: true,
            then: Joi.string().valid(...Object.values(VisualizationType)),
            otherwise: Joi.string().invalid(
                ...Object.values(VisualizationType)
            ),
        },
    ]),
    properties: Joi.object()
        .when('isBaseChart', {
            is: false,
            then: Joi.object().required().not({}).label('ChartTypePropertiesSchema'),
        })
        .optional()
        .label('ChartTypePropertiesSchema'),
}).label('ChartTypeItemSchema');

const ChartTypeChangeItem = ChartTypeItem.keys({
    mark: Joi.string()
        .optional()
        .valid('create', 'remove', 'changeName', 'none')
        .default('none')
        .label('ChartTypeMarkEnum'),
    markParam: Joi.string()
        .when('mark', [
            {
                is: 'changeName',
                then: Joi.string().required(),
                otherwise: Joi.string().optional(),
            },
        ])
        .label('ChartTypeMarkParamString'),
}).label('ChartTypeChangeItemSchema');

const createRequest = Joi.object({
    qlikAppId: Joi.string().required(),
    title: Joi.string().required(),
    description: Joi.string().optional().allow(null),
    label: Joi.string().optional().allow(null),
    type: Joi.string().optional().allow(null),
    dimensions: Joi.array()
        .items(QItem)
        .optional()
        .default([])
        .empty()
        .label('QItemArraySchema'),
    measures: Joi.array()
        .items(QItem)
        .optional()
        .default([])
        .empty()
        .label('QItemArraySchema'),
    filters: Joi.array()
        .items(QItem)
        .optional()
        .default([])
        .empty()
        .label('QItemArraySchema'),
    visualizations: Joi.array()
        .items(ChartTypeItem)
        .optional()
        .default(
            Object.values(VisualizationType).map((x) => {
                return { name: x, isBaseChart: true };
            })
        )
        .min(1)
        .label('ChartTypeItemArraySchema')
        .description('Array of chart types with default base chart types'),
    tags: CommonValidator.arrayOfString.optional().default([]),
    color: Joi.string()
        .optional()
        .regex(/^#[A-Fa-f0-9]{6}$/)
        .allow(null),
}).label('DatasetCreateRequest');

const updateRequest = Joi.object({
    qlikAppId: Joi.string().optional().allow(null),
    title: Joi.string().required(),
    description: Joi.string().optional().allow(null),
    label: Joi.string().optional().allow(null),
    type: Joi.string().optional().allow(null),
    dimensions: Joi.array()
        .items(QItem)
        .optional()
        .default([])
        .empty()
        .label('QItemArraySchema'),
    measures: Joi.array()
        .items(QItem)
        .optional()
        .default([])
        .empty()
        .label('QItemArraySchema'),
    filters: Joi.array()
        .items(QItem)
        .optional()
        .default([])
        .empty()
        .label('QItemArraySchema'),
    visualizations: Joi.array()
        .items(ChartTypeChangeItem)
        .optional()
        .default(
            Object.values(VisualizationType).map((x) => {
                return { name: x, isBaseChart: true };
            })
        )
        .min(1)
        .label('ChartTypeChangeItemArraySchema')
        .description('Array of chart types with default base chart types'),
    tags: CommonValidator.arrayOfString.optional().default([]),
    color: Joi.string()
        .optional()
        .regex(/^#[A-Fa-f0-9]{6}$/)
        .allow(null),
}).label('DatasetUpdateRequest');

const dataset = Joi.object({
    id: Joi.number().required(),
    appUserId: Joi.string().required(),
    qlikAppId: Joi.string().required(),
    qlikApp: Joi.object().optional().allow(null).label('QlikAppSchema'),
    title: Joi.string().required(),
    customerId: Joi.string().required(),
    tenantId: Joi.string().required(),
    appId: Joi.string().required(),
    description: Joi.string().optional().allow(null),
    label: Joi.string().optional().allow(null),
    type: Joi.string().optional().allow(null),
    dimensions: Joi.array()
        .items(QItem)
        .optional()
        .default([])
        .empty()
        .label('QItemArraySchema'),
    measures: Joi.array()
        .items(QItem)
        .optional()
        .default([])
        .empty()
        .label('QItemArraySchema'),
    filters: Joi.array()
        .items(QItem)
        .optional()
        .default([])
        .empty()
        .label('QItemArraySchema'),
    visualizations: Joi.array()
        .items(ChartTypeItem)
        .required()
        .min(1)
        .label('ChartTypeItemArraySchema'),
    tags: CommonValidator.arrayOfString,
    color: Joi.string().optional().allow(null),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required(),
    deletedAt: Joi.date().optional().allow(null),
}).label('DatasetSchema');

const datasets = baseResponseValidator
    .keys({
        data: Joi.array()
            .items(dataset)
            .label('DatasetsMultipleResponse')
            .required(),
        operators: restfulOperatorsValidator,
    })
    .label('DatasetsResponse');

export { dataset, datasets, createRequest, updateRequest };
