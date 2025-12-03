import { QlikQsaasUser, QlikQesUser, QlikUser } from '../entities';
import { AppUser } from '../entities/AppUser';
import { QlikAuthType } from '../services';

interface QlikAuthData {
    //User Metadata
    qlikUser?: QlikQesUser | QlikQsaasUser;
    user: AppUser;
    roles?: string[];
    activeRole: string;
    scopes?: string[];
    email?: string;
    //App Metadata
    qlikAppName?: string;
    customerId: string;
    tenantId: string;
    qlikAppId?: string;
    qlikAppIds?: string[];
    appId: string;
    //Auth Metadata
    vp?: string;
    location?: string;
    authProviderType: QlikAuthType;
}

export { QlikUser, QlikAuthData };
