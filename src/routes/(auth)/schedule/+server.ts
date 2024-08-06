import { setSchedule } from '$lib/server/settings/schedule';
import { error } from '@sveltejs/kit';

export async function POST({ request, locals }) {
    if (!locals.loggedIn) error(401);
    const body = await request.json();
    if (setSchedule(body)) {
        return new Response(null, { status: 200 });
    } else {
        error(400);
    }
}