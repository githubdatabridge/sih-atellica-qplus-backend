import * as Errors from '../errors/Errors';

const ensureServices = (apiKey: string, headerApiKey: string): boolean => {
    const invalidMsg = 'x-api-key header invalid';
    const method = 'ensureServices';

    if (apiKey !== headerApiKey) {
        throw new Errors.Unauthorized(invalidMsg, {
            method,
        });
    }

    return true;
};

export { ensureServices };
