import { DbService } from '../lib/services';
import * as axios from 'axios';
import * as https from 'https';
import {
    QlikIntegrationCreateRequest,
    QlikTaskStartRequest,
    QlikTaskStatusRequest,
    QlikUserActionRequest,
    QlikAppAttachActionRequest,
    QlikAppRemoveAttachmentActionRequest,
    QlikActionRequest,
    QlikUser,
    QlikQesUser,
} from '../entities';
import { container, injectable } from 'tsyringe';
import { ConfigService, QlikUserCacheService } from '.';

// HTTPS agent that accepts self-signed certificates for local development
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});

@injectable()
export class QlikService extends DbService {
    private apiKey: string;
    private cacheService: QlikUserCacheService;
    private axiosInstance: axios.AxiosInstance;

    constructor(configService: ConfigService) {
        const host = configService.get('QLIK_SERVICE_HOST');
        const port = configService.get('QLIK_SERVICE_PORT');

        super(host, port);
        this.apiKey = configService.get('API_KEY') as string;
        this.cacheService = container.resolve(QlikUserCacheService);

        // Create axios instance with HTTPS agent for self-signed certificates
        this.axiosInstance = axios.default.create({
            httpsAgent,
        });
    }

    async onboard(authHeader: string, data: QlikIntegrationCreateRequest) {
        const url = `${this.getUrl()}/integration`;
        try {
            const response = await this.axiosInstance.post(url, data, {
                headers: {
                    Authorization: authHeader,
                    'x-api-key': this.apiKey,
                },
            });

            return response.data;
        } catch (e) {
            return this.parseError('QlikService@onboard', e.response.data);
        }
    }

    async offboard(authHeader: string, extId: string, data: any) {
        const url = `${this.getUrl()}/integration/${extId}`;
        try {
            const response = await this.axiosInstance.delete(url, {
                data,
                headers: {
                    Authorization: authHeader,
                    'x-api-key': this.apiKey,
                },
            });

            return response.data;
        } catch (e) {
            return this.parseError('QlikService@offboard', e.response.data);
        }
    }

    async attachFile(
        authHeader,
        qlikAppGuid: string,
        data: QlikAppAttachActionRequest
    ) {
        const url = `${this.getUrl()}/app/attach?appId=${qlikAppGuid}`;
        try {
            const response = await this.axiosInstance.post(url, data, {
                headers: {
                    Authorization: authHeader,
                    'x-api-key': this.apiKey,
                },
            });
            return response.data;
        } catch (e) {
            return this.parseError('QlikService@attachFile', e.response.data);
        }
    }

    async removeAttachement(
        authHeader,
        qlikAppGuid: string,
        data: QlikAppRemoveAttachmentActionRequest
    ) {
        const url = `${this.getUrl()}/app/remove/attachment?appId=${qlikAppGuid}`;
        try {
            const response = await this.axiosInstance.delete(url, {
                data,
                headers: {
                    Authorization: authHeader,
                    'x-api-key': this.apiKey,
                },
            });
            return response.data;
        } catch (e) {
            return this.parseError(
                'QlikService@removeAttachement',
                e.response.data
            );
        }
    }

    async removeApp(authHeader: string = '', data) {
        const url = `${this.getUrl()}/app/remove`;
        try {
            const response = await this.axiosInstance.delete(url, {
                data,
                headers: {
                    Authorization: authHeader,
                    'x-api-key': this.apiKey,
                },
            });

            return response.data;
        } catch (e) {
            return this.parseError('QlikService@removeApp', e.response.data);
        }
    }

    async startTask(authHeader: string = '', data: QlikTaskStartRequest) {
        const url = `${this.getUrl()}/task/start`;
        try {
            const response = await this.axiosInstance.post(url, data, {
                headers: {
                    Authorization: authHeader,
                    'x-api-key': this.apiKey,
                },
            });

            return response.data;
        } catch (e) {
            return this.parseError('QlikService@startTask', e.response.data);
        }
    }

    async statusTask(authHeader: string = '', data: QlikTaskStatusRequest) {
        const url = `${this.getUrl()}/task/status`;
        try {
            const response = await this.axiosInstance.post(url, data, {
                headers: {
                    Authorization: authHeader,
                    'x-api-key': this.apiKey,
                },
            });

            return response.data;
        } catch (e) {
            return this.parseError('QlikService@startTask', e.response.data);
        }
    }

    async auth(authHeader: string = '', data, sync = true, erase = true) {
        const url = `${this.getUrl()}/user/auth?sync=${sync}&erase=${erase}`;
        console.log('Qlik Auth', authHeader, JSON.stringify(data), sync, url);
        try {
            const response = await this.axiosInstance.post(url, data, {
                headers: {
                    Authorization: authHeader,
                    'x-api-key': this.apiKey,
                },
            });

            return response;
        } catch (e) {
            return this.parseError('QlikService@auth', e.response.data);
        }
    }

    async syncUserProperties(authHeader: string = '', data) {
        const url = `${this.getUrl()}/user/sync`;
        try {
            const response = await this.axiosInstance.post(url, data, {
                headers: {
                    Authorization: authHeader,
                    'x-api-key': this.apiKey,
                },
            });

            return response;
        } catch (e) {
            return this.parseError('QlikService@auth', e.response.data);
        }
    }

    async deallocateLicense(
        authHeader: string = '',
        data: QlikUserActionRequest,
        simulate = false
    ) {
        const url = `${this.getUrl()}/user/deallocate?simulate=${simulate}`;
        try {
            const response = await this.axiosInstance.delete(url, {
                data,
                headers: {
                    Authorization: authHeader,
                    'x-api-key': this.apiKey,
                },
            });

            return response;
        } catch (e) {
            return this.parseError(
                'QlikService@deallocateLicense',
                e.response.data
            );
        }
    }

    async removeUser(authHeader: string = '', data: QlikUserActionRequest) {
        const url = `${this.getUrl()}/user`;
        try {
            const response = await this.axiosInstance.delete(url, {
                data,
                headers: {
                    Authorization: authHeader,
                    'x-api-key': this.apiKey,
                },
            });

            return response;
        } catch (e) {
            return this.parseError('QlikService@removeUser', e.response.data);
        }
    }

    async getUserBySessionId(
        sessionId: string,
        data: QlikActionRequest
    ): Promise<QlikQesUser> {
        const url = `${this.getUrl()}/user/${sessionId}`;
        console.log('[QlikService.getUserBySessionId] Request:', JSON.stringify({
            url,
            sessionId,
            data,
        }));
        try {
            const response = await this.axiosInstance.post<QlikQesUser>(url, data, {
                headers: {
                    'x-api-key': this.apiKey,
                },
            });

            console.log('[QlikService.getUserBySessionId] Response:', JSON.stringify(response.data));
            return response.data;
        } catch (e) {
            console.log('[QlikService.getUserBySessionId] Error:', e.message, e.response?.status, JSON.stringify(e.response?.data));
            this.parseError('QlikService@getUserBySessionId', e.response.data);
        }
    }

    async getUserList(
        qsAppGuid: string,
        data: QlikActionRequest
    ): Promise<QlikQesUser[]> {
        const cacheService = container.resolve(QlikUserCacheService);
        const cacheResult = await cacheService.get(qsAppGuid);

        if (cacheResult !== null) {
            return cacheResult;
        }

        const url = `${this.getUrl()}/user/list/${qsAppGuid}`;
        try {
            const response = await this.axiosInstance.post<QlikQesUser[]>(
                url,
                data,
                {
                    headers: {
                        'x-api-key': this.apiKey,
                    },
                }
            );

            await cacheService.set(qsAppGuid, response.data);
            return response.data;
        } catch (e) {
            this.parseError('QlikService@getUserList', e.response.data);
        }
    }

    async getUserFullList(
        qsAppGuid: string,
        data: QlikActionRequest
    ): Promise<QlikUser[]> {
        const url = `${this.getUrl()}/user/full/list/${qsAppGuid}`;
        try {
            const response = await this.axiosInstance.post<QlikUser[]>(url, data, {
                headers: {
                    'x-api-key': this.apiKey,
                },
            });

            return response.data;
        } catch (e) {
            this.parseError('QlikService@getUserFullList', e.response.data);
        }
    }

    async getAppsByFilter(
        filter: string,
        data: QlikActionRequest
    ): Promise<string[]> {
        const url = `${this.getUrl()}/app/filter`;
        try {
            const response = await this.axiosInstance.post<string[]>(url, data, {
                params: {
                    filter: encodeURI(filter),
                },
                headers: {
                    'x-api-key': this.apiKey,
                },
            });

            return response.data;
        } catch (e) {
            this.parseError('QlikService@getAppsByFilter', e.response.data);
        }
    }

    async endUserSession(
        sessionId: string,
        data: QlikActionRequest
    ): Promise<boolean> {
        const url = `${this.getUrl()}/user/${sessionId}/end`;
        try {
            const response = await this.axiosInstance.post<any>(url, data, {
                headers: {
                    'x-api-key': this.apiKey,
                },
            });

            return response.status === 204;
        } catch (e) {
            this.parseError(
                'QlikService@endUserSession',
                e.response ? e.response.data : {}
            );
        }
    }

    async isSessionActive(
        sessionId: string,
        data: QlikActionRequest
    ): Promise<boolean> {
        const url = `${this.getUrl()}/user/${sessionId}/is-active`;
        try {
            const response = await this.axiosInstance.post<any>(url, data, {
                headers: {
                    'x-api-key': this.apiKey,
                },
            });

            return response.status === 200;
        } catch (e) {
            this.parseError(
                'QlikService@endUserSession',
                e.response ? e.response.data : {}
            );
        }
    }
}
