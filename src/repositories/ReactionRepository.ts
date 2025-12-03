import { KnexService } from '../services';
import { injectable } from 'tsyringe';
import {
    BaseRepository,
    RepositoryResponse,
    PaginationParams,
} from './BaseRepository';
import { Reaction } from '../entities';
import * as _ from 'underscore';
import * as Errors from '../lib/errors';

@injectable()
export class ReactionRepository extends BaseRepository<Reaction> {
    constructor(private knexService?: KnexService) {
        super(knexService, 'reactions');
    }

    async findByID(id: number): Promise<Reaction> {
        const reaction = await super.findByID(id, ['qlik_state']);

        return reaction;
    }

    async findAll(where: Reaction, include?: string[]): Promise<Reaction[]> {
        return await super.findAll(where, ['qlik_state']);
    }

    async getAll(
        where?: Reaction,
        include?: string[],
        filter?: string[][],
        pagination?: PaginationParams
    ): Promise<RepositoryResponse<Reaction[]>> {
        const reactions = await super.getAll(
            where,
            ['qlik_state'],
            filter,
            pagination
        );
        return reactions;
    }

    async getAllWhereByQsUserId(data: Reaction) {
        let reactions = await this.getAll(data);

        const groupedData = _.groupBy(reactions.data, (x) => x.appUserId);

        const res: { appUserId: string; reactions: Reaction[] }[] = [];

        for (let key in groupedData) {
            if (groupedData.hasOwnProperty(key)) {
                res.push({
                    appUserId: key,
                    reactions: groupedData[key],
                });
            }
        }

        return res;
    }

    async countReactionsOnVisualizationWithHash(
        scope: string,
        visualizationId: number,
        customerId: string,
        tenantId: string,
        appId: string
    ) {
        const reactions = await this.findAll({
            scope,
            visualizationId,
            customerId,
            tenantId,
            appId,
        });

        if (reactions && Array.isArray(reactions) && !reactions[0]) {
            return [];
        }

        const groupedReactions = _.groupBy(reactions, (x) => x.score) as any[];
        const count = Object.values(groupedReactions)
            .map((r) => r.length)
            .reduce((a, b) => a + b);

        const data = Object.keys(groupedReactions).map((x) => ({
            count,
            selectionHashes: groupedReactions[x]
                .map((a) => a.qlikState?.qsSelectionHash)
                .filter((a) => a),
        }));

        return data;
    }

    async getReactionsOnVisualizationByScoreAndHash(
        scope: string,
        visualizationId: number,
        customerId: string,
        tenantId: string,
        appId: string
    ) {
        const reactions = await this.findAll({
            scope,
            visualizationId,
            customerId,
            tenantId,
            appId,
        });
        if (reactions && Array.isArray(reactions) && !reactions[0]) {
            return [];
        }

        const groupedReactions = _.groupBy(reactions, (x) => x.score);

        const data = Object.keys(groupedReactions).map((x) => ({
            score: x,
            selectionHashes: groupedReactions[x]
                .map((a) => a.qlikState?.qsSelectionHash)
                .filter((a) => a),
        }));

        return data;
    }

    async getReactionsOnCommentsByScore(
        scope: string,
        commentId: number,
        customerId: string,
        tenantId: string,
        appId: string
    ) {
        const reactions = await this.findAll({
            scope,
            commentId,
            customerId,
            tenantId,
            appId,
        });
        if (reactions && Array.isArray(reactions) && !reactions[0]) {
            return [];
        }

        const groupedReactions = _.groupBy(reactions, (x) => x.score);

        const data = Object.keys(groupedReactions).map((x) => ({
            score: x,
            selectionHashes: groupedReactions[x]
                .map((a) => a.qlikState?.qsSelectionHash)
                .filter((a) => a),
        }));

        return data;
    }

    async getSentimentsByScopeAndVisualizationId(
        scope: string,
        visualizationId: number,
        customerId: string,
        tenantId: string,
        appId: string
    ) {
        const reactions = await this.findAll({
            scope,
            visualizationId,
            customerId,
            tenantId,
            appId,
        });

        return [...new Set(reactions.map((reaction) => reaction.score))];
    }

    async countReactionsByComment(
        scope: string,
        commentId: number,
        customerId: string,
        tenantId: string,
        appId: string
    ) {
        const res = await this.get().count().where({
            scope,
            commentId,
            customerId,
            tenantId,
            appId,
        });

        return res[0]['count(*)'];
    }

    async countReactionsOnCommentsWithHash(
        scope: string,
        commentId: number,
        customerId: string,
        tenantId: string,
        appId: string
    ) {
        const reactions = await this.findAll({
            scope,
            commentId,
            customerId,
            tenantId,
            appId,
        });

        if (!reactions || !reactions.length) {
            throw new Errors.NotFoundError('Reaction not found', {
                method: 'countReactionsOnCommentsWithHash',
            });
        }

        const groupedReactions = _.groupBy(reactions, (x) => x.commentId);

        const data = Object.keys(groupedReactions).map((x) => ({
            count: reactions.length,
            selectionHashes: groupedReactions[x]
                .map((a) => a.qlikState?.qsSelectionHash)
                .filter((a) => a),
        }));

        return data;
    }

    async getSentimentsByScopeAndCommentId(
        scope: string,
        commentId: number,
        customerId: string,
        tenantId: string,
        appId: string
    ) {
        const reactions = await this.findAll({
            scope,
            commentId,
            customerId,
            tenantId,
            appId,
        });

        if (!reactions || !reactions.length) {
            throw new Errors.NotFoundError('Reaction not found', {
                method: 'getSentimentsByScopeAndCommentId',
            });
        }

        return [...new Set(reactions.map((reaction) => reaction.score))];
    }

    async getReactionsBySentimentAndComment(
        scope: string,
        commentId: number,
        score: string
    ) {
        let reactions = [];
        const query =
            'SELECT CONCAT_WS(' +
            `','` +
            ', `r3`.`qs_user_id`' +
            ',`r3`.`count`) AS sentiment' +
            ', `r1`.`*` FROM `Reaction` AS `r1` INNER JOIN ' +
            '(SELECT `r2`.`qs_user_id`,  `r2`.`comment_id`, Count(`r2`.`id`) AS `count` FROM `Reaction` `r2` ' +
            ' WHERE `r2`.`score` = ' +
            ':score' +
            ' AND `r2`.`comment_id` = ' +
            ':commentId' +
            ' AND `r2`.`scope` = ' +
            `:scope` +
            ' GROUP BY `r2`.`qs_user_id`, `r2`.`comment_id`) AS r3 ON `r1`.`qs_user_id` = `r3`.`qs_user_id` AND `r1`.`comment_id` = `r3`.`comment_id`' +
            ' WHERE `r1`.`score` = ' +
            ':score' +
            ' AND `r1`.`comment_id` = ' +
            ':commentId' +
            ' AND `r1`.`scope` = ' +
            `:scope`;

        const data = await this.knexService
            .get()
            .raw(query, {scope, commentId, score} );

        const sentiments: any[] = [
            ...new Set(data.map((reaction) => reaction.sentiment)),
        ];

        for (const sentiment of sentiments) {
            let user = null;
            let count = null;
            user = sentiment.split(',')[0];
            count = sentiment.split(',')[1];
            const filteredReactions = data.filter(
                (reaction) => reaction.sentiment === sentiment
            );

            const userReactions = filteredReactions.map(
                ({ sentiment, ...rest }) => rest
            );

            reactions.push({
                user,
                count,
                reactions: userReactions,
            });
        }

        return reactions;
    }

    async getCount(data: Reaction) {
        const res = await this.get()
            .count()
            .where(Object.assign(data, { deletedAt: null }));

        return res[0]['count(*)'];
    }
}
