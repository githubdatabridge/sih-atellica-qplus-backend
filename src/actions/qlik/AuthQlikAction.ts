import { BaseAction } from '../BaseAction';
import { container, injectable, autoInjectable } from 'tsyringe';
import { QlikUserAuthResponse } from '../../entities';
import { QlikService, ConfigService } from '../../services';
import * as Errors from '../../lib/errors';

@injectable()
@autoInjectable()
export class AuthQlikAction extends BaseAction<QlikUserAuthResponse> {
    constructor(
        private qlikService: QlikService,
        private configService: ConfigService
    ) {
        super();
    }

    async run(userData: any): Promise<QlikUserAuthResponse> {
        try {
            const r = (await this.qlikService.auth(
                null,
                {
                    userInfo: {
                        userDirectory: this.configService.get('APP_NAME'),
                        userId: userData.appUserID,
                        customProperty: this.configService.get(
                            'QS_CUSTOM_PROPERTY_ID'
                        ),
                        attributes: userData.customerIDs.map((customer) => {
                            return { customerId: customer };
                        }),
                    },
                    qrsUserInfo: {
                        userDirectory:
                            this.configService.get('QS_USER_DIRECTORY'),
                        userId: this.configService.get('QS_USER_ID'),
                    },
                    qsInfo: {
                        ssl: this.configService.get('QS_SSL', true),
                        vp: this.configService.get('QS_VP'),
                        host: this.configService.get('QS_HOST'),
                        qrsPort: parseInt(
                            this.configService.get('QS_QRS_PORT')
                        ),
                        qpsPort: parseInt(
                            this.configService.get('QS_QPS_PORT')
                        ),
                    },
                    qrsInfo: {
                        ssl: this.configService.get('QS_SSL', true),
                        host: this.configService.get('QS_HOST'),
                        qrsPort: parseInt(
                            this.configService.get('QS_QRS_PORT')
                        ),
                    },
                },
                this.configService.get('QS_AUTH_SYNC_USER', true)
            )) as unknown as any;

            if (r.status !== 200) {
                throw new Errors.InternalError('Qlik Auth Error', {
                    method: 'AuthQlikAction@run',
                    userData,
                });
            }
            return r.data;
        } catch (error) {
            throw error;
        }
    }
}
