import TransportStream = require('winston-transport');
import { ConfigService, KnexService } from '../../services';
import { container } from 'tsyringe';
import { Knex } from 'knex';

export class WinstonPgTransport extends TransportStream {
    public readonly className = this.constructor.name;
    private tableName: string;
    private kx: Knex;

    constructor(configService: ConfigService) {
        super({
            level: configService.get('LOG_DB_LEVEL') || 'info',
        });

        const ks = container.resolve(KnexService);
        this.kx = ks.get();
        this.tableName = configService.get('LOG_DB_TABLE_NAME');
        this.log = this.log.bind(this);
    }

    public async log(
        info: { [index: string]: string | number },
        callback: () => unknown
    ): Promise<void> {
        try {
            var binding = [
                info.timestamp,
                info.level,
                info.message,
                info.meta ?? null,
                info.label,
            ];
            const sql =
                `INSERT INTO ${this.tableName} (timestamp, level, message, meta, service) VALUES (` +
                binding.map((_) => '?').join(',') +
                `);`;

            await this.kx.raw(sql, [...binding]);
            callback();
        } catch (err) {
            // tslint:disable-next-line: no-console
            console.log(
                `${this.className}.log(${JSON.stringify(
                    info
                )}): Failure to Log: ${err.message}`
            );
        }
    }
}
