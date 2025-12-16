import * as Joi from 'joi';

const arrayOfObjects = Joi.array()
    .items(Joi.object().optional().label('SelectionObjectSchema'))
    .empty(undefined)
    .label('SelectionObjectArraySchema');

const qlikState = Joi.object({
    id: Joi.number().optional(),
    qsBookmarkId: Joi.string().optional(),
    qsSelectionHash: Joi.number().optional().allow(null),
    selections: arrayOfObjects.optional().allow(null),
    meta: Joi.object().optional().allow(null).label('QlikStateMetaSchema'),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required(),
    deletedAt: Joi.date().optional().allow(null),
})
    .xor('qsBookmarkId', 'selections')
    .label('QlikStateSchema');

const qlikStateArray = Joi.array()
    .items(qlikState)
    .optional()
    .allow(null)
    .label('QlikStateArrayRequest');

const qlikStateCreate = Joi.object({
    qsBookmarkId: Joi.string(),
    qsSelectionHash: Joi.number().optional(),
    selections: arrayOfObjects.optional(),
    meta: Joi.object().optional().label('QlikStateMetaSchema'),
})
    .xor('qsBookmarkId', 'selections')
    .label('QlikStateCreateRequest');

const qlikStateCreateArray = Joi.array()
    .items(
        Joi.object({
            qsBookmarkId: Joi.string().required(),
            qsSelectionHash: Joi.number().required(),
        }).label('QlikStateSelectionSchema')
    )
    .optional()
    .allow(null)
    .label('QlikStateCreateArrayRequest');

export { qlikState, qlikStateCreate, qlikStateCreateArray, qlikStateArray };
