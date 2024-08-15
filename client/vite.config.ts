import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:' + (process.env.PORT ?? 6385),
				rewrite: (path) => path.replace(/^\/api/, '')
			}, 
			'/ws': {
				target: 'ws://localhost:' + (process.env.PORT ?? 6385),
				ws: true,
				rewrite: (path) => path.replace(/^\/ws/, '')
			}
		}
	},
	envDir: '../server/config'
});
