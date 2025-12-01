/**
 * Result type for functional error handling.
 * Represents either a success with a value (Ok) or a failure with an error (Err).
 */
export type Result<T, E> = Ok<T, E> | Err<T, E>;

export class Ok<T, E> {
    readonly isSuccess = true;
    readonly isFailure = false;

    constructor(public readonly value: T) { }

    /**
     * Maps the value if successful, otherwise returns the error as is.
     */
    map<U>(f: (value: T) => U): Result<U, E> {
        return new Ok(f(this.value));
    }

    /**
     * Maps the error if failure, otherwise returns the value as is.
     */
    mapErr<F>(f: (error: E) => F): Result<T, F> {
        return new Ok(this.value);
    }

    /**
     * Chains a new Result-returning function if successful.
     */
    andThen<U>(f: (value: T) => Result<U, E>): Result<U, E> {
        return f(this.value);
    }
}

export class Err<T, E> {
    readonly isSuccess = false;
    readonly isFailure = true;

    constructor(public readonly error: E) { }

    map<U>(f: (value: T) => U): Result<U, E> {
        return new Err(this.error);
    }

    mapErr<F>(f: (error: E) => F): Result<T, F> {
        return new Err(f(this.error));
    }

    andThen<U>(f: (value: T) => Result<U, E>): Result<U, E> {
        return new Err(this.error);
    }
}

/**
 * Helper to create a Success result.
 */
export const ok = <T, E>(value: T): Result<T, E> => new Ok(value);

/**
 * Helper to create a Failure result.
 */
export const err = <T, E>(error: E): Result<T, E> => new Err(error);
