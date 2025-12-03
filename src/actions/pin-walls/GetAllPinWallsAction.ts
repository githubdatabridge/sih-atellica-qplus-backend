import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { PinWall } from '../../entities';
import {
    PinWallQlikStateRepository,
    PinWallRepository,
    QlikStateRepository,
} from '../../repositories';
import { parseTextFields } from './util';
import { QlikAuthData } from '../../lib/qlik-auth';

@injectable()
@autoInjectable()
export class GetAllPinWallsAction extends BaseAction<PinWall[]> {
    constructor(
        private pinwallRepository: PinWallRepository,
        private pinwallQlikStatesRepository: PinWallQlikStateRepository,
        private qlikStateRepository: QlikStateRepository
    ) {
        super();
    }
    async run(userData: QlikAuthData, filter?: string[][]): Promise<PinWall[]> {
        const pinwalls = await this.pinwallRepository.getAllWhere(
            {
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                appUserId: userData.user.appUserId,
            },
            null,
            filter
        );

        const pinwallIds = pinwalls.map((n) => n.id);

        const pinwallQlikStates =
            await this.pinwallQlikStatesRepository.findAllIn(
                pinwallIds,
                'pinwallId'
            );

        const qlikStateIds = pinwallQlikStates.map((n) => n.qlikStateId);
        const qlikStates = await this.qlikStateRepository.findAllIn(
            qlikStateIds,
            'id'
        );

        pinwalls.forEach((item) => {
            item.content = parseTextFields(item.content);

            const qlikStateIds = pinwallQlikStates
                .filter((n) => n.pinwallId === item.id)
                .map((j) => j.qlikStateId);

            let states = qlikStates.filter((x) => qlikStateIds.includes(x.id));

            item.qlikState = states;
        });

        return pinwalls;
    }
}
