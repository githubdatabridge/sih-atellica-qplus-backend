import { BaseError } from '.';

export class ValidationError extends BaseError {
    constructor(message: string, customData) {
        super(message);
        this.name = 'ValidationError';
        this.customData = customData;
    }
}

export class NotFoundError extends BaseError {
    constructor(message: string, customData) {
        super(message);
        this.name = 'NotFoundError';
        this.customData = customData;
    }
}

export class QlikError extends BaseError {
    constructor(message: string, customData) {
        super(message);
        this.name = 'QlikError';
        this.customData = customData;
    }
}

export class AlreadyExistsError extends BaseError {
    constructor(message: string, customData) {
        super(message);
        this.name = 'AlreadyExistsError';
        this.customData = customData;
    }
}

export class InternalError extends BaseError {
    constructor(message: string, customData) {
        super(message);
        this.name = 'InternalError';
        this.customData = customData;
    }
}

export class Unauthorized extends BaseError {
    constructor(message: string, customData) {
        super(message);
        this.name = 'Unauthorized';
        this.customData = customData;
    }
}

export class Forbidden extends BaseError {
    constructor(message: string, customData) {
        super(message);
        this.name = 'Forbidden';
        this.customData = customData;
    }
}

export class FailedDependency extends BaseError {
    constructor(message: string, customData) {
        super(message);
        this.name = 'FailedDependency';
        this.customData = customData;
    }
}
export class BadDataError extends BaseError {
    constructor(message: string, customData) {
        super(message);
        this.name = 'BadDataError';
        this.customData = customData;
    }
}
