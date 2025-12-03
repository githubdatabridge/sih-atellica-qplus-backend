import { injectable, autoInjectable } from 'tsyringe';
import { PingService } from '.';

@injectable()
@autoInjectable()
export class PongService {
    constructor(private pingService?: PingService) {}

    pong() {
        return this.pingService.ping() + '-pong';
    }
}
