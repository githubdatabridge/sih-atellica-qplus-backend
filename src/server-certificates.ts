import * as fs from 'fs';
import * as path from 'path';
import { container } from 'tsyringe';
import { ConfigService, LogService } from './services';
import { ENV_PARAMS } from './services/ConfigService';

interface ServerCertificates {
    pfx: Buffer;
    key: Buffer;
    cert: Buffer;
}

interface TokenCertificates<T> {
    pfx: T;
    key: T;
    cert: T;
}

let certs: ServerCertificates = null;

const getServerCertificatePath = (certFileName: string): string => {
    var configService = container.resolve(ConfigService);
    const settings = {
        SERVER_CERT_PATH: path.resolve(configService.get(ENV_PARAMS.SERVER_CERT_PATH)),
    };

    return `${settings.SERVER_CERT_PATH}/${certFileName}`;
};

const getServerCertificates = (): ServerCertificates => {
    if (certs) {
        return certs;
    }

    var configService = container.resolve(ConfigService);
    var serverCertPath = path.resolve(configService.get(ENV_PARAMS.SERVER_CERT_PATH));

    const readServerCert = (certFilename) => {
        return fs.readFileSync(`${serverCertPath}/${certFilename}`);
    };

    certs = {
        pfx: undefined, //readServerCert('server.pfx'),
        key: readServerCert(configService.get(ENV_PARAMS.SERVER_KEY_FILE_NAME)),
        cert: readServerCert(configService.get(ENV_PARAMS.SERVER_CERT_FILE_NAME)),
    };

    return certs;
};

const getTokenCertificates = (): TokenCertificates<string> => {
    var serverCertPath = path.resolve(`${__dirname}/certificates/data`);
    var logger = container.resolve(LogService);

    const readServerCert = (certFilename) => {
        try {
            return fs.readFileSync(`${serverCertPath}/${certFilename}`, {
                encoding: 'utf8',
            });
        } catch (error) {
            logger.get().warn(`Missing JWT Token certs in ./build/certificates/data`);
            return '';
        }
    };

    const certs: TokenCertificates<string> = {
        pfx: undefined,
        key: readServerCert('privatekey.pem.txt'),
        cert: readServerCert('publickey.cer'),
    };

    return certs;
};

export {
    getServerCertificates,
    getServerCertificatePath,
    getTokenCertificates,
};
