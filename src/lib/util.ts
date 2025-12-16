import { Comment, CommentType, Report } from '../entities';
import { AppUser } from '../entities/AppUser';
import { QlikAuthData } from './qlik-auth';

export const handleTextFields = (field) => {
    if (field === null) {
        return field;
    }

    if (typeof field === 'string') {
        return JSON.parse(field);
    }

    if (typeof field === 'object') {
        return JSON.stringify(field);
    }

    return field;
};

function checkIfUserIsAdmin(userData: QlikAuthData, scopes?: string[]) {
    if (!userData || !userData.roles) {
        return false;
    }

    const isAdmin = userData.activeRole === 'admin';

    if (scopes && scopes.length) {
        return scopes.some((s) => userData.scopes.includes(s)) && isAdmin;
    }

    return isAdmin;
}

function secondsSinceUnixEpoch(date: Date = null): number {
    if (!date) {
        date = new Date();
    }
    return Math.round(date.valueOf() / 1000);
}

function AssignUser(appUserId: string, users: AppUser[]): AppUser {
    let result = users.find((x) => x.appUserId === appUserId);

    if (!result) {
        result = {
            name: 'NONE',
            appUserId: 'NONE',
            email: '',
        };
    }

    return result;
}

const ExtractCookieStateFromHeaders = (headers: any): any => {
    const state: any = {};
    if (!headers.cookie) {
        return state;
    }
    const cookieString: string = headers.cookie;

    const cookieArray = cookieString.split(';').map((x) => x.split('='));

    cookieArray.forEach((c) => {
        if (!Array.isArray(c) || !c[0] || !c[1]) {
            return;
        }
        state[`${c[0].trim()}`] = c[1].trim();
    });

    return state;
};

const uniqueById = (entities: Report[]): Report[] => {
    const unique = [];
    entities.forEach((e) => {
        if (!unique.some((u) => u.id === e.id)) {
            unique.push({ ...e });
        }
    });
    return unique;
};

function getCommentType(data: Comment) {
    return data.reportId ? CommentType.Report : CommentType.Visualization;
}

function parsTextFromComment(comment: Comment): string {
    const content = JSON.parse(comment.content);

    const text =
        content.blocks && content.blocks.length
            ? content.blocks
                  .map((c) => c.text)
                  .join(' ')
                  .trim()
            : '';
    return text;
}

import * as axios from 'axios';
import * as http from 'http';
import * as https from 'https';

const axiosInstance = (apiKey: string, type: AxiosInstanceType) => {
    switch (type) {
        case AxiosInstanceType.QlikSaasService:
            return axios.default.create({
                headers: { 'x-api-key': `${apiKey}` },
                //60 sec timeout
                timeout: 60000,

                //keepAlive pools and reuses TCP connections, so it's faster
                httpAgent: new http.Agent({ keepAlive: true }),
                httpsAgent: new https.Agent({
                    keepAlive: true,
                    rejectUnauthorized: false,
                }),

                //follow up to 10 HTTP 3xx redirects
                maxRedirects: 10,

                //cap the maximum content length we'll accept to 50MBs, just in case
                maxContentLength: 50 * 1000 * 1000,
            });

        default:
            throw new Error(`AxiosInstanceType ${type} not implanted.`);
    }
};

const axiosClassicInstance = (accessToken: string) => {
    return axios.default.create({
        headers: { Authorization: `Bearer ${accessToken}` },
        //60 sec timeout
        timeout: 60000,

        //keepAlive pools and reuses TCP connections, so it's faster
        httpAgent: new http.Agent({ keepAlive: true }),
        httpsAgent: new https.Agent({
            keepAlive: true,
            rejectUnauthorized: false,
        }),

        //follow up to 10 HTTP 3xx redirects
        maxRedirects: 10,

        //cap the maximum content length we'll accept to 50MBs, just in case
        maxContentLength: 50 * 1000 * 1000,
    });
};

enum AxiosInstanceType {
    QlikSaasService,
}

const jwtTokenDecode = <T>(token: string) => {
    const tokenParts = token.split('.');
    let partIndex = 0;
    if (tokenParts.length === 3) {
        partIndex = 1;
    } else if (tokenParts.length === 2) {
        partIndex = 0;
    } else {
        throw new Error('Invalid jwt token.');
    }
    const base64Payload = tokenParts[partIndex];
    const payload = Buffer.from(base64Payload, 'base64');
    const result = JSON.parse(payload.toString()) as T;
    return result;
};

export {
    checkIfUserIsAdmin,
    ExtractCookieStateFromHeaders,
    uniqueById,
    parsTextFromComment,
    getCommentType,
    AssignUser,
    axiosInstance,
    AxiosInstanceType,
    jwtTokenDecode,
    secondsSinceUnixEpoch,
    axiosClassicInstance,
};
