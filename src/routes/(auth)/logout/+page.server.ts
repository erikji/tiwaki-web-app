import * as session from '$lib/server/auth/session.js';
import { redirect } from '@sveltejs/kit';

export async function load({ cookies }) {
    session.del(cookies.get('auth') as string);
    cookies.delete('auth', { path: '/' });
    redirect(303, '/login');
}