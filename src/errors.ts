export class InvalidInputError extends Error {
    readonly code = 'ERR_INVALID_PNG_INPUT' as const;

    constructor(message: string) {
        super(message);
        this.name = 'InvalidInputError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class PathValidationError extends Error {
    readonly code = 'ERR_PATH_VALIDATION' as const;

    constructor(message: string) {
        super(message);
        this.name = 'PathValidationError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class ResourceLimitError extends Error {
    readonly code = 'ERR_RESOURCE_LIMIT' as const;

    constructor(message: string) {
        super(message);
        this.name = 'ResourceLimitError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
