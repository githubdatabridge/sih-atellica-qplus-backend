import { Bookmark, BookmarkItem } from '../../entities';
import { transformQlikState } from '../reports/QlikStateTransformer';

const transformBookmark = (data: Bookmark): Bookmark => {
    const result: Bookmark = {
        id: data.id,
        name: data.name,
        tenantId: data.tenantId,
        appId: data.appId,
        customerId: data.customerId,
        isPublic: data.isPublic,
        user: data.user,
        appUserId: data.appUserId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        bookmarkItems: data.bookmarkItems.map((x) => transformBookmarkItem(x)),
    };

    if(data.path)
        result.path = data.path

    if(data.meta)
        result.meta = data.meta 

    return result;
};

const transformBookmarkItem = (data: BookmarkItem): BookmarkItem => {
    const result: BookmarkItem = {
        id: data.id,
        qlikAppId: data.qlikAppId,
        bookmarkId:data.bookmarkId,
        qlikState: transformQlikState(data.qlikState),
        qlikStateId: data.qlikStateId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    };
    return result;
};

export { transformBookmark };
