import { QlikAuthData } from '../../lib/qlik-auth';

const transformMe = (userData: QlikAuthData): QlikAuthData => {
    const result: QlikAuthData = { ...userData };
    delete result['token'];
    delete result['cookie'];

    return result;
};

export { transformMe };
