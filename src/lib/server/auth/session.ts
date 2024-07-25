import { v4 } from 'uuid';

const sessions = new Map<string, number>();

export function gen() {
    return v4();
}
export function val(token: string) {
    return sessions.has(token) && Date.now() < sessions.get(token)! && Boolean(sessions.set(token, Date.now() + 3600000));
}
export function add() {
    const token = v4();
    sessions.set(token, Date.now() + 3600000);
    return token;
}