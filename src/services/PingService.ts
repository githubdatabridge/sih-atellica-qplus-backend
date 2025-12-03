import { injectable } from 'tsyringe';

@injectable()
export class PingService {
    constructor() {}

    ping() {
        return 'ping';
    }
}
