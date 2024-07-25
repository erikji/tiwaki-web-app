import { val } from "$lib/server/auth/session";
import { type Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
    const token = event.cookies.get('auth');
    event.locals.loggedIn = typeof token == 'string' && val(token);
    return resolve(event);
}