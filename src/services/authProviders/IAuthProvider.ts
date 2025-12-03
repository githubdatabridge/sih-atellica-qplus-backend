import { QlikAuthType } from '..';
import { QlikAuthData, QlikUser } from '../../lib/qlik-auth';

export interface IAuthProvider {
    readonly type: QlikAuthType;
    ensureQlikUser(...arg): Promise<QlikAuthData>;
    getUserList(userData: QlikAuthData): Promise<QlikUser[]>;
    getUserFullList(userData: QlikAuthData): Promise<QlikUser[]>;
    handleLogout(...arg): Promise<void>;
}
