/**
 * Application Error Codes
 */
export type AppErrorCode =
    | 'VALIDATION_ERROR'
    | 'RESOURCE_NOT_FOUND'
    | 'CALCULATION_ERROR'
    | 'INTERNAL_ERROR'
    | 'NOT_IMPLEMENTED';

/**
 * Base class for application errors.
 */
export class AppError extends Error {
    public readonly code: AppErrorCode;
    public readonly cause?: unknown;

    constructor(code: AppErrorCode, message: string, cause?: unknown) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.cause = cause;
    }

    static validation(message: string, cause?: unknown): AppError {
        return new AppError('VALIDATION_ERROR', message, cause);
    }

    static notFound(message: string, cause?: unknown): AppError {
        return new AppError('RESOURCE_NOT_FOUND', message, cause);
    }

    static calculation(message: string, cause?: unknown): AppError {
        return new AppError('CALCULATION_ERROR', message, cause);
    }

    static internal(message: string, cause?: unknown): AppError {
        return new AppError('INTERNAL_ERROR', message, cause);
    }
}
