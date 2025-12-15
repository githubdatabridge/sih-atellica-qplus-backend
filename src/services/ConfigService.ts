import { injectable } from 'tsyringe';

import * as dotenv from 'dotenv';

export enum ENV_PARAMS {
    HOST = 'HOST',
    PORT = 'PORT',
    SSL = 'SSL',
    TITLE = 'TITLE',
    VERSION = 'VERSION',
    APP_NAME = 'APP_NAME',
    DB_HOST = 'DB_HOST',
    DB_PORT = 'DB_PORT',
    DB_USER = 'DB_USER',
    DB_PASS = 'DB_PASS',
    DB_DATABASE = 'DB_DATABASE',
    DB_SCHEMA = 'DB_SCHEMA',
    DB_SSL = 'DB_SSL',
    QLIK_SERVICE_HOST = 'QLIK_SERVICE_HOST',
    QLIK_SERVICE_PORT = 'QLIK_SERVICE_PORT',
    API_KEY = 'API_KEY',
    QLIK_APP_SESSION_HEADER = 'QLIK_APP_SESSION_HEADER',
    LOG_TYPE = 'LOG_TYPE',
    LOG_DIR = 'LOG_DIR',
    LOG_LEVEL = 'LOG_LEVEL',
    LOG_CORE_FILE = 'LOG_CORE_FILE',
    LOG_DATE_PATTERN = 'LOG_DATE_PATTERN',
    LOG_MAX_SIZE = 'LOG_MAX_SIZE',
    LOG_MAX_FILES = 'LOG_MAX_FILES',
    LOG_DB_LEVEL = 'LOG_DB_LEVEL',
    LOG_DB_TABLE_NAME = 'LOG_DB_TABLE_NAME',
    TENANT_FILE_PATH = 'TENANT_FILE_PATH',
    TENANT_FILE_NAME = 'TENANT_FILE_NAME',
    TENANT_FILE_ONLY = 'TENANT_FILE_ONLY',
    STATE_SECRET = 'STATE_SECRET',
    JWT_AUDIENCE = 'JWT_AUDIENCE',
    JWT_ISSUER = 'JWT_ISSUER',
    JWT_EXPIRES_IN = 'JWT_EXPIRES_IN',
    QLIK_SAAS_SERVICE_HOST = 'QLIK_SAAS_SERVICE_HOST',
    QLIK_SAAS_SERVICE_PORT = 'QLIK_SAAS_SERVICE_PORT',
    ROLES_MAPPER = 'ROLES_MAPPER',
    QLIK_CLOUD_INCLUDE_ACCESS_TOKEN = 'QLIK_CLOUD_INCLUDE_ACCESS_TOKEN',
    DEFAULT_ROLES = 'DEFAULT_ROLES',
    DEFAULT_SCOPES = 'DEFAULT_SCOPES',
    SERVER_CERT_PATH = "SERVER_CERT_PATH",
    SERVER_CERT_FILE_NAME = "SERVER_CERT_FILE_NAME",
    SERVER_KEY_FILE_NAME = "SERVER_KEY_FILE_NAME"
}
@injectable()
export class ConfigService {
    config: dotenv.DotenvConfigOutput;

    private static DEFAULTS = {
        // Server
        [ENV_PARAMS.HOST]: 'local.databridge.ch',
        [ENV_PARAMS.PORT]: 3002,
        [ENV_PARAMS.SSL]: true,
        [ENV_PARAMS.TITLE]: 'Sih Qplus Backend',
        [ENV_PARAMS.VERSION]: '1',

        [ENV_PARAMS.APP_NAME]: 'SihQplusApi',

        // Database
        [ENV_PARAMS.DB_HOST]: 'localhost',
        [ENV_PARAMS.DB_PORT]: '5432',
        [ENV_PARAMS.DB_USER]: 'root',
        [ENV_PARAMS.DB_PASS]: 'root',
        [ENV_PARAMS.DB_DATABASE]: 'sih_qplus',
        [ENV_PARAMS.DB_SCHEMA]: 'qplus',
        [ENV_PARAMS.DB_SSL]: false,

        // Qlik Service
        [ENV_PARAMS.QLIK_SERVICE_HOST]: 'https://local.databridge.ch',
        [ENV_PARAMS.QLIK_SERVICE_PORT]: 3001,

        [ENV_PARAMS.API_KEY]: 'f919861d-dda2-442e-b238-fee4f417445ba',
        [ENV_PARAMS.QLIK_APP_SESSION_HEADER]: 'X-Qlik-Session',

        // Logging
        [ENV_PARAMS.LOG_TYPE]: 'file', // file | database | null => null == both
        [ENV_PARAMS.LOG_DIR]: 'logs',
        [ENV_PARAMS.LOG_LEVEL]: 'info',
        [ENV_PARAMS.LOG_CORE_FILE]: 'core.log',
        [ENV_PARAMS.LOG_DATE_PATTERN]: 'YYYY-MM-DD',
        [ENV_PARAMS.LOG_MAX_SIZE]: '20m',
        [ENV_PARAMS.LOG_MAX_FILES]: '14d',
        [ENV_PARAMS.LOG_DB_LEVEL]: 'debug',
        [ENV_PARAMS.LOG_DB_TABLE_NAME]: 'logs',

        // Tenant
        [ENV_PARAMS.TENANT_FILE_PATH]: './',
        [ENV_PARAMS.TENANT_FILE_NAME]: 'configuration.json',
        [ENV_PARAMS.TENANT_FILE_ONLY]: false,

        // JWT
        [ENV_PARAMS.STATE_SECRET]: 'very_secret_secret_very_secret_secret',
        [ENV_PARAMS.JWT_AUDIENCE]: 'qlik.api/login/jwt-session',
        [ENV_PARAMS.JWT_ISSUER]: 'dtl14iitpf4e7e7.eu.qlikcloud.com',
        [ENV_PARAMS.JWT_EXPIRES_IN]: 3600,

        // Qlik SaaS
        [ENV_PARAMS.QLIK_SAAS_SERVICE_HOST]: 'http://localhost',
        [ENV_PARAMS.QLIK_SAAS_SERVICE_PORT]: 3003,

        // Roles
        [ENV_PARAMS.ROLES_MAPPER]: 'dataconsumer=>admin;consumer=>user',
        [ENV_PARAMS.QLIK_CLOUD_INCLUDE_ACCESS_TOKEN]: false,
        [ENV_PARAMS.DEFAULT_ROLES]: 'user',
        [ENV_PARAMS.DEFAULT_SCOPES]: 'user:default,datasets:read',

        // SSL certificates (paths relative to project root)
        [ENV_PARAMS.SERVER_CERT_PATH]: '../certificates/server/',
        [ENV_PARAMS.SERVER_CERT_FILE_NAME]: 'server.crt',
        [ENV_PARAMS.SERVER_KEY_FILE_NAME]: 'server.key',
    };

    constructor() {
        this.init();
    }

    private init() {
        this.config = dotenv.config();
    }

    get(value: string, isBool = false, isArray = false): any {
        let result = process.env[value];

        if (!process.env || !process.env[value]) {
            result = ConfigService.DEFAULTS[value];
        }

        if (isArray) {
            if (result === '' || result === null || result === undefined)
                return [];
            return result.split(',');
        }

        let boolResult = !isBool
            ? result
            : typeof result === 'boolean'
            ? result
            : result === 'false'
            ? false
            : result === 'true'
            ? true
            : null;

        if (isBool && boolResult === null)
            throw new Error(`Invalid boolean value for ${value} in .env file`);

        return boolResult;
    }
}
