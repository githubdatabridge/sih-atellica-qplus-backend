import { KnexService } from '../services';
import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';
import { QlikState } from '../entities/QlikState';
import { Errors } from '../lib';

@injectable()
export class QlikStateRepository extends BaseRepository<QlikState> {
    constructor(private knexService?: KnexService) {
        super(knexService, 'qlik_states');
    }

    async updateQlikState(
        qlikStateId: number,
        newQlikState: QlikState,
        trx
    ): Promise<QlikState> {
        if (qlikStateId) {
            const isDeleted = await this.deleteWhere(
                {
                    id: qlikStateId,
                },
                trx
            );

            if (!isDeleted) {
                throw new Errors.InternalError('Failed to update QlikState.', {
                    method: 'UpdateQlikState',
                    qlikStateId: qlikStateId,
                });
            }
        }

        const qlikState = newQlikState
            ? await this.create(newQlikState, trx)
            : null;
        return qlikState;
    }
}
