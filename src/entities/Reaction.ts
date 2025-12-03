import { QlikState } from './QlikState';
import { BaseEntity } from './BaseEntity';
import { AppUser } from './AppUser';
import { UserMetadata } from './UserMetadata';

export interface Reaction extends BaseEntity, UserMetadata {
    score?: number;
    appUserId?: string;
    qlikStateId?: number;
    scope?: string;
    commentId?: number;
    visualizationId?: number;
    qlikState?: QlikState;
    user?: AppUser;
}

export interface Sentiment {
    score: number;
    label: string;
}

export const sentiments: Array<Sentiment> = [
    { score: 5, label: 'Like' },
    { score: 4, label: 'Idea' },
    { score: 3, label: 'Applause' },
    { score: 2, label: 'Thinking' },
    { score: 1, label: 'Angry' },
];
