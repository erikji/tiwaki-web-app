import { verify } from "$lib/server/auth/account";
import * as sessions from "$lib/server/auth/session";
import { error, redirect, type Actions } from "@sveltejs/kit";

export const actions: Actions = {
    default: async ({ locals, request, cookies }) => {
        if (locals.loggedIn) redirect(303, '/');
        const data = await request.formData();
        const username = data.get('username') as string;
        const password = data.get('password') as string;
        if (verify(username, password)) {
            const tkn=sessions.add();
            cookies.set('auth', tkn, { path: '/' });
            redirect(303, '/');
        } else {
            error(401);
        }
    }
}