import * as jwt from '@hapi/jwt';
import { getTokenCertificates } from '../server-certificates';

const generateJwtToken = (payload: JwtPayload, options: JwtSigningOptions) => {
    const key = getTokenCertificates().key;
    const JWT_ID = payload.JWT_ID;
    const notBefore = payload.notBefore;

    delete payload.JWT_ID;
    delete payload.notBefore;

    const result = jwt.token.generate(
        {
            ...payload,
            aud: options.audience,
            iss: options.issuer,
            jti: JWT_ID,
            nbf: notBefore,
        },
        {
            key: key,
            algorithm: 'RS256',
        },
        {
            header: { kid: options.keyid },
            ttlSec: options.expiresIn,
        }
    );
    return result;
};

interface JwtPayload {
    sub: string;
    subType: string;
    name: string;
    status: string;
    email: string;
    userId: string;
    email_verified: boolean;
    groups: string[];
    access_token: string;
    tenantId: string;
    customerId: string;
    mashupAppName: string;
    JWT_ID: string;
    notBefore: number;
}

interface JwtSigningOptions {
    keyid: string;
    algorithm: string;
    issuer: string;
    expiresIn: number;
    audience: string;
}

export { generateJwtToken, JwtPayload, JwtSigningOptions };
