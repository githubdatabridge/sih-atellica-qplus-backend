import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { PinWall, PinWallContent } from '../../entities';
import {
    PinWallQlikStateRepository,
    PinWallRepository,
    QlikStateRepository,
} from '../../repositories';
import { parseTextFields } from './util';
import { Errors } from '../../lib';
import { PinWallService, QlikStateService } from '../../services';

@injectable()
@autoInjectable()
export class CreatePinWallAction extends BaseAction<PinWall> {
    constructor(
        private pinwallRepository: PinWallRepository,
        private qlikStateRepository: QlikStateRepository,
        private qlikStateService: QlikStateService,
        private pinwallQlikStateRepository: PinWallQlikStateRepository,
        private pinWallService: PinWallService
    ) {
        super();
    }
    async run(data: PinWall): Promise<PinWall> {
        const qlikStateData = data.qlikState ? [...data.qlikState] : [];

        delete data.qlikState;

        const isValid = await this.pinWallService.CheckIfReportIdIsValid(
            data.content as PinWallContent,
            data.customerId,
            data.tenantId,
            data.appId,
            data.appUserId
        );

        const pinwallData = {
            ...data,
            content: parseTextFields(data.content),
        };

        if (!isValid) {
            throw new Errors.ValidationError(
                'Invalid reportId associated with pin-wall.',
                {
                    action: 'CreatePinWallAction',
                }
            );
        }

        const result = await this.pinwallRepository.create(pinwallData);

        const pinwallQlikStates = [];

        let qlikStateIds = [];
        let qlikStates = [];

        if (qlikStateData && qlikStateData.length) {
            const newQlikStates = qlikStateData.map((x) => {
                return this.qlikStateService.handleTextFields(x);
            });

            qlikStates =
                await this.qlikStateRepository.createMany(newQlikStates);
            qlikStateIds = qlikStates.map((item) => item.id);

            qlikStateIds.forEach((qlikStateId) => {
                pinwallQlikStates.push({
                    pinwallId: result.id,
                    qlikStateId: qlikStateId,
                });
            });

            await this.pinwallQlikStateRepository.createMany(pinwallQlikStates);
        }

        result.content = parseTextFields(result.content);
        result.qlikState = qlikStates;

        return result;
    }
}
