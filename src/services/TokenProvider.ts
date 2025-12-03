import { Issuer, TokenSet } from 'openid-client';
import { delay, inject, singleton } from 'tsyringe';
import { LogService } from './LogService';

const scopes = 'user_default';
@singleton()
export class TokenProvider {
    constructor(@inject(delay(() => LogService)) private logger?: LogService) {}
    private cachedTokenSets: { [issuer: string]: TokenSet } = {};

    async getAccessToken(
        issuer: string,
        client_id: string,
        client_secret: string,
        maxRetries: number = 3
    ) {
        const cachedTokenSet = this.cachedTokenSets[issuer];
        if (
            cachedTokenSet &&
            !(Date.now().valueOf() > cachedTokenSet.expires_at * 1000)
        ) {
            this.logger
                .get()
                .debug(
                    `Cached Access token for [${issuer}] expire at: [${new Date(
                        cachedTokenSet.expires_at * 1000
                    )}].`
                );
            return cachedTokenSet.access_token;
        }

        this.logger.get().info(`Trying to get Access token from [${issuer}].`);
        for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
            try {
                const TrustIssuer = await Issuer.discover(issuer);

                const client = new TrustIssuer.Client({
                    client_id: client_id,
                    client_secret: client_secret,
                });

                const tokenSet = await client.grant({
                    grant_type: 'client_credentials',
                    scope: scopes,
                });

                if (tokenSet) {
                    this.cachedTokenSets[issuer] = tokenSet;
                    return tokenSet.access_token;
                }
            } catch (error) {
                this.logger
                    .get()
                    .error(
                        `Error retrieving access token (Retry ${
                            retryCount + 1
                        }/${maxRetries}):`,
                        error
                    );
            }
        }

        throw new Error(
            'Unable to retrieve access token after maximum retries.'
        );
    }
}
