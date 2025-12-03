import { UserMetadata } from './UserMetadata';

export interface ClientBase<T> extends UserMetadata {
    userId: string;
    socket: T;
    uid: string;
}
