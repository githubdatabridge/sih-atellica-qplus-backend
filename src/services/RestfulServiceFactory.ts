import { container, injectable } from 'tsyringe';
import { RestfulService } from './RestfulService';

@injectable()
export class RestfulServiceFactory {
    constructor() {}

    create() {
        return container.resolve(RestfulService);
    }
}
