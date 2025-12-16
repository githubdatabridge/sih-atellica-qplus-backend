import { singleton } from 'tsyringe';
import { loggers, format, transports, transport } from 'winston';
import DailyRotateFile = require('winston-daily-rotate-file');
import { ConfigService } from './ConfigService';
import { join } from 'path';
const { combine, timestamp } = format;
import { WinstonPgTransport } from '../lib/log/WinstonPgTransport';

@singleton()
export class LogService {
    label: string;
    private readonly logType: string;

    constructor(private configService?: ConfigService) {
        const fs = require('fs');
        const logDir = this.configService.get('LOG_DIR');

        if (!fs.existsSync(logDir)) {
            // Create the directory if it does not exist
            fs.mkdirSync(logDir);
        }

        this.label = configService.get('APP_NAME');
        this.logType = this.configService.get('LOG_TYPE');
    }

    get() {
        if (loggers.has(this.label)) {
            return loggers.get(this.label);
        }

        const transportsToEnable: transport[] = [
            new transports.Console({
                format: format.combine(
                    format.timestamp(),
                    format.cli(),
                    format.printf(this.logFormatTemplate)
                ),
                level:
                    this.configService.get('NODE_ENV') === 'production' ||
                    this.configService.get('NODE_ENV') === 'staging'
                        ? 'info'
                        : 'debug',
            }),
        ];

        if (
            process.platform === 'win32' &&
            process.env.NODE_ENV === 'production'
        ) {
            const WinstonWinEventLogger =
                require('../lib/log/winston-win-event-logger').WinstonWinEventLogger;
            transportsToEnable.push(
                new WinstonWinEventLogger({
                    source: this.label,
                })
            );
        }

        if (!this.logType || this.logType == 'database') {
            transportsToEnable.push(new WinstonPgTransport(this.configService));
        }

        if (!this.logType || this.logType == 'file') {
            transportsToEnable.push(
                new DailyRotateFile({
                    format: format.combine(
                        format.timestamp(),
                        format.printf(this.logFormatTemplate)
                    ),
                    datePattern: this.configService.get('LOG_DATE_PATTERN'),
                    zippedArchive: false,
                    maxSize: this.configService.get('LOG_MAX_SIZE'),
                    maxFiles: this.configService.get('LOG_MAX_FILES'),
                    level: this.configService.get('LOG_LEVEL'),
                    filename: join(
                        this.configService.get('LOG_DIR'),
                        `/${this.configService.get('LOG_CORE_FILE')}_%DATE%.log`
                    ),
                })
            );
        }

        loggers.add(this.label, {
            transports: transportsToEnable,
            exitOnError: false, // don't crash no error,
            format: combine(
                format.errors({ stack: true }), // log the full stack
                timestamp(), // get the time stamp part of the full log message
                format.label({ label: this.label })
            ),
        });

        return loggers.get(this.label);
    }

    logFormatTemplate(i: {
        level: string;
        message: string;
        [key: string]: any;
        request: any;
    }): string {
        return `${i.timestamp}  ${i.level}  [${i.label}]    ${i.message}    ${
            i[0] ? JSON.stringify(i[0]?.info) : ''
        }`;
    }
}
