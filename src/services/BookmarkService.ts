import { Transaction } from 'knex/lib';
import { injectable } from 'tsyringe';
import { Bookmark, BookmarkItem } from '../entities';
import { Errors } from '../lib';
import { BaseError } from '../lib/errors';
import { QlikAuthData } from '../lib/qlik-auth';
import {
    BookmarkItemRepository,
    BookmarkRepository,
    QlikStateRepository,
    UserBookmarkRepository,
} from '../repositories';
import { KnexService } from './KnexService';
import { QlikStateService } from './QlikStateService';

@injectable()
export class BookmarkService {
    constructor(
        private qlikStateRepository?: QlikStateRepository,
        private bookmarkRepository?: BookmarkRepository,
        private bookmarkItemRepository?: BookmarkItemRepository,
        private userBookmarkRepository?: UserBookmarkRepository,
        private knexService?: KnexService,
        private qlikStateService?: QlikStateService
    ) {}

    async loadById(userData: QlikAuthData, id: number) {
        const result = await this.bookmarkRepository.getAllBookmarks(
            userData.user.appUserId,
            {
                tenantId: userData.tenantId,
                customerId: userData.customerId,
                appId: userData.appId,
            },
            { id },
            true,
            ['bookmark_items']
        );

        if (!result || !result.data || !Array.isArray(result.data)) {
            throw new Errors.InternalError('Failed to retrieve bookmarks.', {
                action: 'BookmarkService@loadById',
                bookmarkId: id,
                appUserId: userData.user.appUserId,
            });
        }

        if (result.data.length === 0) {
            return;
        }

        const qlikStates = await this.qlikStateRepository.findAllIn(
            result.data[0].bookmarkItems.map((x) => x.qlikStateId)
        );

        result.data[0].bookmarkItems = result.data[0].bookmarkItems.map((x) => {
            x.qlikState = qlikStates.find((j) => j.id === x.qlikStateId);
            return x;
        });

        return result.data[0];
    }

    async update(bookmark: Bookmark, data: Bookmark, userData: QlikAuthData) {
        const trx = (await this.knexService.transaction()) as Transaction;
        try {
            const bookmark_items: BookmarkItem[] = await this.updateMany(
                bookmark.id,
                data.bookmarkItems,
                userData,
                trx
            );
            delete data.bookmarkItems;
            bookmark = await this.bookmarkRepository.update(
                data.id,
                data,
                true,
                trx
            );

            await trx.commit();

            const response = bookmark;
            response.bookmarkItems = bookmark_items;

            return response;
        } catch (error) {
            await trx.rollback(new Error('Condition caused rollback!'));
            throw error;
        }
    }

    async delete(data: Bookmark) {
        const trx = (await this.knexService.transaction()) as Transaction;
        try {
            await this.deleteMany(data.bookmarkItems, trx);

            await this.bookmarkRepository.deleteWhere({ id: data.id }, trx);

            await this.userBookmarkRepository.deleteWhereIn(
                'bookmarkId',
                [data.id],
                trx
            );

            await trx.commit();

            return;
        } catch (error) {
            await trx.rollback(new Error('Condition caused rollback!'));
            throw error;
        }
    }

    async create(data: Bookmark, userData: QlikAuthData) {
        const trx = (await this.knexService.transaction()) as Transaction;
        try {
            const bookmark_items = data.bookmarkItems;
            delete data.bookmarkItems;

            const result = await this.bookmarkRepository.create(data, trx);

            bookmark_items.forEach((x) => {
                x.bookmarkId = result.id;
            });

            const bookmarkItems = await this.createMany(
                userData,
                bookmark_items,
                trx
            );

            await trx.commit();

            result.bookmarkItems = bookmarkItems;

            return result;
        } catch (error) {
            await trx.rollback(new Error('Condition caused rollback!'));

            if (error instanceof InvalidQlikAppIdError) {
                throw new Errors.ValidationError(error.message, {
                    ...error.customData,
                });
            }
            throw error;
        }
    }

    private async createMany(
        userData: QlikAuthData,
        items: BookmarkItem[],
        trx: Transaction
    ): Promise<BookmarkItem[]> {
        const result: BookmarkItem[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (!userData.qlikAppIds.includes(item.qlikAppId)) {
                throw new InvalidQlikAppIdError(
                    'BookmarkItem with given qlikAppId is not allowed.',
                    {
                        action: 'BookmarkItemService@createMany',
                        qlikAppId: item.qlikAppId,
                        qlikAppIds: userData.qlikAppIds.join('; '),
                    }
                );
            }
            const qlikState = item.qlikState;
            const newQlikState =
                this.qlikStateService.handleTextFields(qlikState);

            delete item.qlikState;

            const savedQlikState = await this.qlikStateRepository.create(
                newQlikState,
                trx
            );

            item.qlikStateId = savedQlikState.id;

            const savedItem = await this.bookmarkItemRepository.create(
                item,
                trx
            );

            savedItem.qlikState = savedQlikState;

            result.push(savedItem);
        }
        return result;
    }

    private async updateMany(
        bookmarkId: number,
        bookmark_items: BookmarkItem[],
        userData: QlikAuthData,
        trx: Transaction
    ): Promise<BookmarkItem[]> {
        const existing = await this.bookmarkItemRepository.findAll({
            bookmarkId,
        });

        const forUpdate = bookmark_items.filter((x) => x.id !== undefined);
        const forCreate = bookmark_items.filter((x) => x.id === undefined);
        const forDelete = existing.filter((_x) => !forUpdate.some((s) => s.id));

        const updated = await this._updateMany(userData, forUpdate, trx);

        forCreate.forEach((x) => (x.bookmarkId = bookmarkId));
        const created = await this.createMany(userData, forCreate, trx);

        await this.deleteMany(forDelete, trx);

        return [...created, ...updated];
    }

    private async deleteMany(
        items: BookmarkItem[],
        trx: Transaction
    ): Promise<void> {
        const qlikStateIds = items.map((x) => x.qlikStateId);

        await this.qlikStateRepository.deleteWhereIn('id', qlikStateIds, trx);

        await this.bookmarkItemRepository.deleteWhereIn(
            'id',
            items.map((x) => x.id),
            trx
        );
    }

    private async _updateMany(
        userData: QlikAuthData,
        items: BookmarkItem[],
        trx: Transaction
    ): Promise<BookmarkItem[]> {
        const result: BookmarkItem[] = [];
        for (const item of items) {
            if (!userData.qlikAppIds.includes(item.qlikAppId)) {
                throw new InvalidQlikAppIdError(
                    'BookmarkItem with given qlikAppId is not allowed.',
                    {
                        action: 'BookmarkItemService@updateMany',
                        qlikAppId: item.qlikAppId,
                        qlikAppIds: userData.qlikAppIds.join('; '),
                    }
                );
            }

            const qlikState = await this.qlikStateRepository.update(
                item.qlikStateId,
                item.qlikState,
                true,
                trx
            );
            delete item.qlikState;
            const itemUpdated = await this.bookmarkItemRepository.update(
                item.id,
                item,
                true,
                trx
            );
            itemUpdated.qlikState = qlikState;
            result.push(itemUpdated);
        }
        return result;
    }
}

export class InvalidQlikAppIdError extends BaseError {
    constructor(message: string, customData) {
        super(message);
        this.name = 'InvalidQlikAppIdError';
        this.customData = customData;
    }
}
