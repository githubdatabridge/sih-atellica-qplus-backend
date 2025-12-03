import { DbService } from '../lib/services';
import { container, injectable } from 'tsyringe';
import { ConfigService, LogService } from '.';
import { axiosInstance, AxiosInstanceType } from '../lib/util';
import { QsaasUserLight } from '../entities';
import { AxiosHeaders } from 'axios';

export interface QlikSaasConfig {
    'x-tenant-id': string;
    'x-qlik-host': string;
    'x-qlik-api-key': string;
}
@injectable()
export class QlikSaasService extends DbService {
    private readonly apiKey;
    private readonly logger;
    constructor(configService: ConfigService) {
        const host = configService.get('QLIK_SAAS_SERVICE_HOST');
        const port = configService.get('QLIK_SAAS_SERVICE_PORT');

        super(host, port);
        this.apiKey = configService.get('API_KEY');
        this.logger = container.resolve(LogService);
    }

    async getUser(email: string, spaceId: string, config: QlikSaasConfig) {
        const response = (await this.getUsers(
            spaceId,
            config
        )) as QsaasUserLight[];

        return response.find((x) => x.email === email);
    }

    async getUserById(id: string, spaceId: string, config: QlikSaasConfig) {
        const path = `/users/${spaceId}/${id}`;

        const url = `${this.getUrl()}${path}`;
        this.logger.get().debug(`QlikSaasService ${path}.`);

        const headers: AxiosHeaders = this.setHeaders(config);
        try {
            const response = await axiosInstance(
                this.apiKey,
                AxiosInstanceType.QlikSaasService
            ).get<QsaasUserLight>(url, { headers });

            return response.data;
        } catch (e) {
            return this.parseError(
                'QlikSaasService@getUserById',
                e.response ? e.response.data : e.message
            );
        }
    }

    async getSpaceOwner(spaceId: string, config: QlikSaasConfig) {
        const path = `/spaces/${spaceId}/owner`;

        const url = `${this.getUrl()}${path}`;
        this.logger.get().debug(`QlikSaasService ${path}.`);

        const headers: AxiosHeaders = this.setHeaders(config);
        try {
            const response = await axiosInstance(
                this.apiKey,
                AxiosInstanceType.QlikSaasService
            ).get<QsaasUserLight>(url, { headers });

            return response.data;
        } catch (e) {
            return this.parseError(
                'QlikSaasService@getSpaceOwner',
                e.response ? e.response.data : e.message
            );
        }
    }

    async getUsers(spaceId: string, config: QlikSaasConfig) {
        const path = `/users/${spaceId}`;

        const url = `${this.getUrl()}${path}`;
        this.logger.get().debug(`QlikSaasService ${path}.`);

        const headers: AxiosHeaders = this.setHeaders(config);

        try {
            const response = await axiosInstance(
                this.apiKey,
                AxiosInstanceType.QlikSaasService
            ).get<QsaasUserLight[]>(url, { headers });

            return response.data;
        } catch (e) {
            return this.parseError(
                'QlikSaasService@getUsers',
                e.response ? e.response.data : e.message
            );
        }
    }

    private setHeaders(config: QlikSaasConfig) {
        const headers: AxiosHeaders = new AxiosHeaders();
        headers.set('x-tenant-id', config['x-tenant-id']);
        headers.set('x-qlik-host', config['x-qlik-host']);
        headers.set('x-qlik-api-key', config['x-qlik-api-key']);
        return headers;
    }
}
