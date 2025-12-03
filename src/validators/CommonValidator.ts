import Joi = require('joi');

const arrayOfString = Joi.array()
    .items(Joi.string())
    .empty()
    .label('StringArraySchema');

const arrayOfObjects = Joi.array()
    .items(Joi.object().required())
    .required()
    .empty()
    .label('ObjectArraySchema');

const dictionaryOfStrings = Joi.object()
    .pattern(Joi.string(), arrayOfString)
    .label('DictionaryOfStrings');

export { arrayOfString, arrayOfObjects, dictionaryOfStrings };
