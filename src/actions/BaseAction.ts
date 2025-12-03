export abstract class BaseAction<T> {
    abstract run(...args): T | Promise<T>;
}
