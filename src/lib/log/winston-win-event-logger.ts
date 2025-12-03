import TransportStream = require('winston-transport');
import { exec } from 'child_process';

type WinstonWinEventLoggerOptions = TransportStream.TransportStreamOptions & {
    source: string;
};
export class WinstonWinEventLogger extends TransportStream {
    constructor(private opts: WinstonWinEventLoggerOptions) {
        super(opts);

        if (!opts) {
            throw new Error('The options parameter is required');
        }

        if (!opts.source) {
            throw new Error('The source option is required');
        }

        if (typeof opts.source !== 'string') {
            throw new Error('The source option must be a string');
        }
    }

    log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        let { message, level } = info;
        let eventType;

        switch (level) {
            case 'error':
                eventType = 'ERROR';
                break;
            case 'warn':
                eventType = 'WARNING';
                break;
            default:
                eventType = 'INFORMATION';
                break;
        }

        if (eventType !== 'INFORMATION') {
            this.logEvent(message, eventType, this.opts.source);
        }

        callback();
    }

    logEvent(message, eventType, source) {
        const eventId = 1000; // Replace with your desired event ID
        const command = `eventcreate /T ${eventType} /ID ${eventId} /L APPLICATION /SO ${source} /D "${message}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(
                    `Windows Event: Error logging event: ${error.message}`
                );
                return;
            }

            if (stderr) {
                console.error(`Windows Event: Standard error: ${stderr}`);
                return;
            }
        });
    }
}
