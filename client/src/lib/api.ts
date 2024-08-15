import { goto } from '$app/navigation';

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
    if (input.toString().startsWith('/')) {
        input = input.substring(1);
    }
    try {
        const res = await fetch('/api/' + input, init);
        if (res.status == 401) {
            goto('/login', { replaceState: true });
        }
        return res;
    } catch (e) {
        console.error(e);
        throw e;
    }
}