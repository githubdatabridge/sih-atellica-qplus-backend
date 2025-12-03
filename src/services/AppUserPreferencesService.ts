import { injectable } from 'tsyringe';

import { AppUserPreferences } from '../entities';

@injectable()
export class AppUserPreferencesService {
    fixTypes(data: AppUserPreferences) {
        data.chatbot = !!data.chatbot;
        data.forecast = !!data.forecast;
        data.socialBar = !!data.socialBar;
        data.notifications = !!data.notifications;

        try {
            data.additionalPreferences = JSON.parse(
                data.additionalPreferences as any
            );
        } catch (e) {
            data.additionalPreferences = null;
        }

        return data;
    }

    createDefault(
        appUserId: string,
        customerId: string,
        tenantId: string,
        appId: string
    ): AppUserPreferences {
        return {
            chatbot: true,
            forecast: true,
            socialBar: false,
            notifications: true,
            themeMain: 'bexio',
            language: 'EN',
            additionalPreferences: null,
            customerId,
            tenantId,
            appId,
            appUserId,
        };
    }
}
