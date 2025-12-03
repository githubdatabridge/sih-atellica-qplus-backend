import Joi = require('joi');

const headerValidator = Joi.object({
    'x-tenant-id': Joi.string().required(),
    'x-customer-id': Joi.string().required(),
    'x-app-name': Joi.string().required(),

    'x-app-admin': Joi.boolean().optional(),
    'x-vp': Joi.string().optional(),
}).options({ allowUnknown: true });

export { headerValidator };
