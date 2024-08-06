import { setPolygon } from '$lib/server/settings/polygon';
import { error } from '@sveltejs/kit';

export async function POST({ request, locals }) {
    if (!locals.loggedIn) error(401);
    const body = await request.json();
    if (await setPolygon(body)) {
        return new Response(null, { status: 200 });
    } else {
        error(400);
    }
}