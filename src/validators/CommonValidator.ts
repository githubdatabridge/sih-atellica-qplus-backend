import Joi = require('joi');

const arrayOfString = Joi.array()
    .items(Joi.string().label('StringItem'))
    .empty()
    .label('StringArraySchema');

const arrayOfObjects = Joi.array()
    .items(Joi.object().required().label('GenericObjectSchema'))
    .required()
    .empty()
    .label('GenericObjectArraySchema');

const dictionaryOfStrings = Joi.object()
    .pattern(Joi.string(), arrayOfString)
    .label('DictionaryOfStrings');

export { arrayOfString, arrayOfObjects, dictionaryOfStrings };
