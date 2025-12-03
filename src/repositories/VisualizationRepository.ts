import { KnexService } from '../services';
import { injectable } from 'tsyringe';
import {
    BaseRepository,
    RepositoryResponse,
    PaginationParams,
} from './BaseRepository';
import { Visualization } from '../entities';

@injectable()
export class VisualizationRepository extends BaseRepository<Visualization> {
    constructor(private knexService?: KnexService) {
        super(knexService, 'visualizations');
    }

    async getAll(
        where?: Visualization,
        include?: string[],
        filter?: string[][],
        pagination?: PaginationParams
    ): Promise<RepositoryResponse<Visualization[]>> {
        return super.getAll(where, null, filter, pagination);
    }

    async findByID(id: number): Promise<Visualization> {
        return super.findByID(id, null);
    }
}
