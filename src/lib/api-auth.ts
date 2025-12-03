import { ensureServices } from '../lib/services';

const ensureApi = (apiKey, headers): boolean => {
    return ensureServices(apiKey, headers['x-api-key']);
};

export { ensureApi };
