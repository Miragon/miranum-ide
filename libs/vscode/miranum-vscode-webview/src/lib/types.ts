export interface VscMessage<T> {
    type: string;
    data?: T;
    message?: string;
}
