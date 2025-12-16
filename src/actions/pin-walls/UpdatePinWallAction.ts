import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { PinWall, PinWallContent } from '../../entities';
import {
    PinWallQlikStateRepository,
    PinWallRepository,
    QlikStateRepository,
} from '../../repositories';
import * as Errors from '../../lib/errors';
import { parseTextFields } from './util';
import { PinWallService, QlikStateService } from '../../services';

@injectable()
@autoInjectable()
export class UpdatePinWallAction extends BaseAction<PinWall> {
    constructor(
        private pinwallRepository: PinWallRepository,
        private pinwallQlikStateRepository: PinWallQlikStateRepository,
        private qlikStateRepository: QlikStateRepository,
        private qlikStateService: QlikStateService,
        private pinWallService: PinWallService
    ) {
        super();
    }
    async run(data: PinWall): Promise<PinWall> {
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

        if (pinwallFromDB.customerId !== data.customerId) {
            throw new Errors.NotFoundError('Update Pin Wall Action', {
                pinwallId: data.id,
                appUserId: data.appUserId,
                customerId: data.customerId,
            });
        }

        if (pinwallFromDB.appUserId !== data.appUserId) {
            throw new Errors.Unauthorized('Update Pin Wall Action', {
                pinwallId: data.id,
                appUserId: data.appUserId,
                customerId: data.customerId,
            });
        }

        let qlikStates = data.qlikState;

        if (qlikStates) {
            let pinwallQlikStates =
                await this.pinwallQlikStateRepository.getAllWhere({
                    pinwallId: pinwallFromDB.id,
                });

            await this.pinwallQlikStateRepository.deleteWhere({
                pinwallId: pinwallFromDB.id,
            });

            await this.qlikStateRepository.deleteWhereIn(
                'id',
                pinwallQlikStates.map((x) => x.qlikStateId)
            );

            const qlikStateData = qlikStates ? [...qlikStates] : [];

            pinwallQlikStates = [];

            let qlikStateIds = [];

            if (qlikStateData && qlikStateData.length) {
                const newQlikStates = qlikStateData.map((x) => {
                    return this.qlikStateService.handleTextFields(x);
                });

                qlikStates =
                    await this.qlikStateRepository.createMany(newQlikStates);
                qlikStateIds = qlikStates.map((item) => item.id);

                qlikStateIds.forEach((qlikStateId) => {
                    pinwallQlikStates.push({
                        pinwallId: pinwallFromDB.id,
                        qlikStateId: qlikStateId,
                    });
                });

                await this.pinwallQlikStateRepository.createMany(
                    pinwallQlikStates
                );
            }
        }

        delete data.qlikState;

        const updateData = {
            ...pinwallFromDB,
            ...data,
        };

        if (data.content) {
            const isValid = await this.pinWallService.CheckIfReportIdIsValid(
                updateData.content as PinWallContent,
                updateData.customerId,
                updateData.tenantId,
                updateData.appId,
                updateData.appUserId
            );

            updateData.content = parseTextFields(updateData.content);

            if (!isValid) {
                throw new Errors.ValidationError(
                    'Invalid reportId associated with pin-wall.',
                    {
                        action: 'UpdatePinWallAction',
                    }
                );
            }
        }

        const updatedPinwall = await this.pinwallRepository.update(
            data.id,
            updateData,
            true
        );

        updatedPinwall.qlikState = qlikStates || [];

        updatedPinwall.content = parseTextFields(updatedPinwall.content);

        return updatedPinwall;
    }
}
