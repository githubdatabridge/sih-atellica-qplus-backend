import { singleton } from 'tsyringe';
import { Engine } from '@hapi/catbox-memory';
import { Client, CacheKey } from '@hapi/catbox';
import { QlikQesUser } from '../entities';

export abstract class CacheService<T> {
    private client: Client<T[]>;
    private segment;
    private ttl;

    constructor() {}

    async init(segment = 'test', ttl: number = 10 * 1000) {
        this.client = new Client<T[]>(Engine);
        if (this.client.validateSegmentName(segment) !== null) {
            //log that segment name is invalid
            console.warn(`segment name is invalid [${segment}]`);
            return;
        }
        this.segment = segment;
        this.ttl = ttl;
        await this.client.start();
    }

    async get(id: string): Promise<T[] | null> {
        if (!this.client.isReady()) {
            //log that cache not set
            console.warn(`cache not started`);
            return [];
        }

        const key = this.key(id);
        const result = await this.client.get(key);
        if (!result) {
            return null;
        }
        return result.item;
    }

    async set(id: string, data: T[]) {
        const key = this.key(id);
        await this.client.set(key, data, this.ttl);
    }

    private key(id): CacheKey {
        return { id, segment: this.segment };
    }
}

@singleton()
export class QlikUserCacheService extends CacheService<QlikQesUser> {
    constructor() {
        super();
    }
}
