import { injectable } from 'tsyringe';

@injectable()
export class UtilService {
    constructor() {}

    // A helper method used to read a Node.js readable stream into a Buffer
    async streamToBuffer(readableStream) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            readableStream.on('data', (data) => {
                chunks.push(data instanceof Buffer ? data : Buffer.from(data));
            });
            readableStream.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
            readableStream.on('error', reject);
        });
    }

    getContentType(fileExt) {
        let contentType;
        switch (fileExt) {
            case 'json':
                contentType = 'application/json';
                break;
            case 'pdf':
                contentType = 'application/pdf';
                break;
            case 'ppt':
                contentType = 'application/vnd.ms-powerpoint';
                break;
            case 'pptx':
                contentType =
                    'application/vnd.openxmlformats-officedocument.preplyentationml.preplyentation';
                break;
            case 'xls':
                contentType = 'application/vnd.ms-excel';
                break;
            case 'xlsx':
                contentType =
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                break;
            case 'doc':
                contentType = 'application/msword';
                break;
            case 'docx':
                contentType =
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                break;
            case 'csv':
                contentType = 'application/octet-stream';
                break;
            case 'xml':
                contentType = 'application/xml';
                break;
        }
        return contentType;
    }

    arrayBufferToString(buffer) {
        return String.fromCharCode.apply(null, new Uint16Array(buffer));
    }

    formatElapsedTime(date: any) {
        const today: any = new Date();
        const seconds: any = Math.floor((today - date) / 1000);
        let interval: number = seconds / 31536000;

        if (interval > 1) {
            return (
                Math.floor(interval) +
                (Math.floor(interval) === 1 ? ' year' : ' years')
            );
        }
        interval = seconds / 2592000;
        if (interval > 1) {
            return (
                Math.floor(interval) +
                (Math.floor(interval) === 1 ? ' month' : ' months')
            );
        }
        interval = seconds / 86400;
        if (interval > 1) {
            return (
                Math.floor(interval) +
                (Math.floor(interval) === 1 ? ' day' : ' days')
            );
        }
        interval = seconds / 3600;
        if (interval > 1) {
            return (
                Math.floor(interval) +
                (Math.floor(interval) === 1 ? ' hour' : ' hours')
            );
        }
        interval = seconds / 60;
        if (interval > 1) {
            return (
                Math.floor(interval) +
                (Math.floor(interval) === 1 ? ' minute' : ' minutes')
            );
        }
        return (
            Math.floor(seconds) +
            (Math.floor(interval) === 1 ? ' second' : ' seconds')
        );
    }
}
