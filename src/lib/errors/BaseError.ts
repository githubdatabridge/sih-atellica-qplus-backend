export class BaseError extends Error {
    public customData = {};
    constructor(message: string, customData?: any) {
        super(message);

        if (customData) {
            this.customData = customData;
        }
    }
}
