import * as Joi from 'joi';
import * as AppUserValidator from './AppUserValidator';

const shareRequest = Joi.object({
    appUserIds: Joi.array()
        .unique()
        .items(Joi.string().required())
        .required()
        .label('AppUserIdsSchema')
        .description('Unique array of string(guid).'),
}).label('ShareReportRequest');

const shareResponse = Joi.array()
    .items(AppUserValidator.response)
    .label('ShareWithUsersResponse');

export { shareRequest, shareResponse };
