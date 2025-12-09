import * as Joi from 'joi';

const response = Joi.object({
    id: Joi.number().required().not(null),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required(),
    deletedAt: Joi.date().required().allow(null),
    chatbot: Joi.boolean().required().not(null),
    forecast: Joi.boolean().required().not(null),
    socialBar: Joi.boolean().required().not(null),
    notifications: Joi.boolean().required().not(null),
    themeMain: Joi.string().required().not(null),
    language: Joi.string()
        .required()
        .valid('EN')
        .valid('DE')
        .valid('IT')
        .valid('FR')
        .not(null)
        .label('LanguageEnum'),
    additionalPreferences: Joi.object()
        .allow(null)
        .label('AppUserPreferenceAdditionalSchema'),
    customerId: Joi.string().required().not(null),
    tenantId: Joi.string().required().not(null),
    appId: Joi.string().required().not(null),
    appUserId: Joi.string().required().not(null),
}).label('AppUserPreferencesResponse');

const request = Joi.object({
    chatbot: Joi.boolean().optional().not(null),
    forecast: Joi.boolean().optional().not(null),
    socialBar: Joi.boolean().optional().not(null),
    notifications: Joi.boolean().optional().not(null),
    themeMain: Joi.string().optional().not(null),
    language: Joi.string()
        .optional()
        .valid('EN')
        .valid('DE')
        .valid('IT')
        .valid('FR')
        .not(null)
        .label('LanguageEnum'),
    additionalPreferences: Joi.object()
        .allow(null)
        .label('AppUserPreferenceAdditionalSchema'),
}).label('AppUserPreferencesRequest');

export { response, request };
