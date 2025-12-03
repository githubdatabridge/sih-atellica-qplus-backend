import * as Joi from 'joi';
import * as AppUserValidator from './AppUserValidator';
import {
    baseResponseValidator,
    restfulOperatorsValidator,
} from './BaseResponseValidator';
import * as QlikStateValidator from './QlikStateValidator';

const bookmarkItem = Joi.object({
    id: Joi.number().required(),
    bookmarkId: Joi.number().required(),
    qlikStateId: Joi.number().required(),
    qlikAppId: Joi.string().required(),
    qlikState: QlikStateValidator.qlikState.required(),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required(),
}).label('BookmarkItemSchema');

const bookmarkItemCreate = Joi.object({
    qlikAppId: Joi.string().required(),
    qlikState: QlikStateValidator.qlikStateCreate.required(),
}).label('BookmarkItemRequest');

const bookmarkItemUpdate = Joi.object({
    id: Joi.number().optional(),
    bookmarkId: Joi.number().optional(),
    qlikStateId: Joi.number().optional(),
    qlikAppId: Joi.string().required(),
    qlikState: QlikStateValidator.qlikStateCreate.required(),
}).label('BookmarkItemRequest');

const createRequest = Joi.object({
    name: Joi.string().max(50).required(),
    path: Joi.string().max(200).optional(),
    meta: Joi.object().optional(),
    bookmarkItems: Joi.array().items(bookmarkItemCreate).min(1),
}).label('BookmarkRequest');

const updateRequest = Joi.object({
    name: Joi.string().max(50).required(),
    meta: Joi.object().optional(),
    path: Joi.string().max(200).optional(),
    bookmarkItems: Joi.array().items(bookmarkItemUpdate).min(1),
}).label('BookmarkUpdate');

const bookmark = Joi.object({
    id: Joi.number().required(),
    name: Joi.string().required(),
    isPublic: Joi.boolean().required(),
    meta: Joi.object().optional(),
    path: Joi.string().max(200).optional(),
    appUserId: Joi.string().optional().allow(null),
    tenantId: Joi.string().required(),
    appId: Joi.string().required(),
    customerId: Joi.string().required(),
    user: AppUserValidator.response.optional(),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required(),
    deletedAt: Joi.date().optional().allow(null),
    bookmarkItems: Joi.array().items(bookmarkItem),
}).label('BookmarkSchema');

const bookmarks = baseResponseValidator
    .keys({
        data: Joi.array()
            .items(bookmark)
            .required()
            .empty()
            .label('BookmarkMultipleResponse'),
        operators: restfulOperatorsValidator,
    })
    .label('BookmarksResponse');

const shareRequest = Joi.object({
    appUserIds: Joi.array()
        .unique()
        .items(Joi.string().required())
        .required()
        .label('AppUserIdsSchema')
        .description('Unique array of string(guid).'),
}).label('ShareBookmarks');

const shareResponse = Joi.array()
    .items(AppUserValidator.response)
    .label('ShareWithUsersResponse');

export {
    createRequest,
    bookmarks,
    bookmark,
    updateRequest,
    shareRequest,
    shareResponse,
};
