import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { PinWallContent } from '../../entities';
import { PinWallRepository } from '../../repositories';
import * as Errors from '../../lib/errors';
import { PinWallService } from '../../services';

export interface GetFiltersForPinWallData {
    id: number;
    customerId: string;
    tenantId: string;
    appId: string;
    appUserId: string;
}

@injectable()
@autoInjectable()
export class GetFiltersForPinWallAction extends BaseAction<{
    [key: string]: string[];
}> {
    constructor(
        private pinwallRepository: PinWallRepository,
        private pinWallService: PinWallService
    ) {
        super();
    }
    async run(
        data: GetFiltersForPinWallData
    ): Promise<{ [key: string]: string[] }> {
        const pinwallFromDB = await this.pinwallRepository.findByID(data.id);

        if (
            !pinwallFromDB ||
            pinwallFromDB.customerId !== data.customerId ||
            pinwallFromDB.tenantId !== data.tenantId ||
            pinwallFromDB.appId !== data.appId
        ) {
            throw new Errors.NotFoundError('Update Pin Wall Action', {
                pinwallId: data.id,
                appUserId: data.appUserId,
                customerId: data.customerId,
                tenantId: data.tenantId,
                appId: data.appId,
            });
        }
        const pinwallFilters = await this.pinWallService.GetFiltersForPinWall(
            JSON.parse(pinwallFromDB.content) as PinWallContent
        );

        return pinwallFilters;
    }
}
