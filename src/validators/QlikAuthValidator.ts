import * as Joi from 'joi';

const settings = Joi.object({
    ttl: Joi.number().required(),
    domain: Joi.string().optional(),
    path: Joi.string().optional(),
    clearInvalid: Joi.boolean().optional(),
    isSameSite: Joi.string().optional(),
    isSecure: Joi.boolean().optional(),
    isHttpOnly: Joi.boolean().optional(),
}).label('QlikAuthCookieSettingsRequest');

const qlikAuthCookiePayloadRequest = Joi.object({
    name: Joi.string().required(),
    settings,
}).label('QlikAuthCookieRequest');

export { qlikAuthCookiePayloadRequest };
