export interface QlikCookieSettings {
    ttl: number;
    domain: string;
    path?: string;
    clearInvalid?: boolean;
    isSameSite?: string;
    isSecure?: boolean;
    isHttpOnly?: boolean;
}

export interface QlikCookie {
    name: string;
    settings: QlikCookieSettings;
}
