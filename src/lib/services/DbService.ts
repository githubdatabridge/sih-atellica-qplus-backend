import * as Errors from '../../lib/errors';

export class DbService {
    constructor(protected host: string, protected port?: number) {}

    protected getUrl() {
        //[FIX]
        //separate: scheme (http|https), hostname(example.com:8888), path (/path)
        //example: `${scheme}://${hostname}${path}` => https://example.com:8888/path
        return `${this.host}${this.port !== 0 ? ':' + this.port : ''}`;
    }

    protected parseError(tag: string, data) {
        if (data.statusCode === 401) {
            throw new Errors.Unauthorized('Unauthorized', {
                method: tag,
                data: data,
            });
        } else if (data.statusCode === 500) {
            throw new Errors.InternalError('Internal Server Error', {
                method: tag,
                data: data,
            });
        } else if (data.statusCode === 400) {
            throw new Errors.ValidationError('Bad Request', {
                method: tag,
                data: data,
            });
        } else if (data.statusCode === 404) {
            throw new Errors.NotFoundError('Not Found', {
                method: tag,
                data: data,
            });
        } else {
            throw new Errors.InternalError('Internal Error', {
                method: tag,
                data: data,
            });
        }
    }
}
