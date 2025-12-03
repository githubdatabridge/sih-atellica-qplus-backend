import { Controller } from 'hapi-decorators';
import * as apiAuth from '../lib/api-auth';

export class BaseController implements Controller {
    baseUrl: string;
    routes: () => any[];

    protected ensureApi(apiKey, state): boolean {
        return apiAuth.ensureApi(apiKey, state);
    }
}
