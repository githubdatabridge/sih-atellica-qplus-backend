import * as Joi from 'joi';
import * as CommonValidator from './CommonValidator';
import * as UserValidator from './UserValidator';

const response = Joi.object({
    appUserId: Joi.string().required(),
    name: Joi.string().required(),
    email: Joi.string().optional().allow(''),
}).label('AppUserResponse');

const CustomProperty = Joi.object({
    key: Joi.string().required(),
    name: Joi.string().required(),
    values: Joi.array()
        .items(Joi.string().required().label('CustomPropertyValueString'))
        .required()
        .empty()
        .label('CustomPropertyValuesArraySchema'),
}).label('CustomPropertySchema');

const QlikUser = UserValidator.userResponse
    .keys({
        status: Joi.string().optional(),
        customProperties: Joi.array()
            .items(CustomProperty)
            .empty()
            .label('CustomPropertyArraySchema'),
    })
    .label('AppUserWithCustomPropertiesSchema');

const authQlikResponse = Joi.object({
    sessionId: Joi.string().guid().required(),
}).label('AuthQlikResponse');

const meResponse = Joi.object({
    qlikUser: QlikUser.optional(),
    user: response.required(),
    customerId: Joi.string().required(),
    tenantId: Joi.string().required(),
    qlikAppId: Joi.string().optional(),
    appId: Joi.string().required(),
    roles: CommonValidator.arrayOfString
        .required()
        .min(1)
        .message('Roles should contain minimum one role type.'),
    scopes: CommonValidator.arrayOfString.optional().empty(),
    email: Joi.string().optional().allow(''),
    qlikAppName: Joi.string().optional(),
    vp: Joi.string().optional(),
    activeRole: Joi.string().required(),
    authProviderType: Joi.string().optional(),
    qlikAppIds: Joi.array()
        .items(Joi.string().label('QlikAppIdString'))
        .label('QlikAppIdsArraySchema'),
}).label('MeResponse');

export { response, authQlikResponse, meResponse };
