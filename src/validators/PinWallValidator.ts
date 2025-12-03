import * as Joi from 'joi';
import * as QlikStateValidator from './QlikStateValidator';

const cell = Joi.object({
    visualizationId: Joi.string(),
    reportId: Joi.number().positive(),
    width: Joi.number().positive().required(),
    height: Joi.number().positive().required(),
    x: Joi.number().required(),
    y: Joi.number().required(),
})
    .xor('visualizationId', 'reportId')
    .label('PinWallContentCell');

const content = Joi.object()
    .keys({
        cellCount: Joi.number().positive().required(),
        cells: Joi.array()
            .items(cell)
            .optional()
            .label('PinWallContentCellArray'),
    })
    .label('PinWallContentSchema');

const response = Joi.object({
    id: Joi.number().required(),
    content: content
        .options({ allowUnknown: true })
        .required()
        .label('PinWallContentSchema'),
    appUserId: Joi.string().required(),
    customerId: Joi.string().required(),
    tenantId: Joi.string().required(),
    appId: Joi.string().required(),
    title: Joi.string().required(),
    description: Joi.string().optional().allow(null).allow(''),
    isFavourite: Joi.boolean().required(),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required(),
    deletedAt: Joi.date().required().allow(null),
    qlikState: QlikStateValidator.qlikStateArray
        .optional()
        .allow(null)
        .allow({}),
}).label('PinWallResponse');

const createRequest = Joi.object({
    title: Joi.string().required().not(null),
    description: Joi.string().optional(),
    content: content
        .options({ allowUnknown: true })
        .required()
        .label('PinWallContent'),
    isFavourite: Joi.boolean().optional().default(false),
    qlikState: QlikStateValidator.qlikStateCreateArray
        .optional()
        .allow(null)
        .allow({}),
}).label('PinWallRequest');

const update = Joi.object({
    content: content
        .options({ allowUnknown: true })
        .optional()
        .label('PinWallContent'),
    title: Joi.string().optional().allow(null, ''),
    description: Joi.string().optional().allow(null, ''),
    isFavourite: Joi.boolean().optional(),
    qlikState: QlikStateValidator.qlikStateCreateArray
        .optional()
        .allow(null)
        .allow({}),
}).label('PinWallUpdateRequest');

const responseArray = Joi.array()
    .items(response)
    .required()
    .empty()
    .label('PinWallResponseArray');

export { response, createRequest, update, responseArray };
