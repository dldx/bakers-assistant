import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),

    kit: {
        // adapter-static config
        adapter: adapter({
            // default options are shown. On some platforms
            // these options are set automatically — see below
            pages: 'build',
            assets: 'build',
            fallback: '404.html',
            precompress: false,
            strict: true
        }),
        paths: {
            base: process.env.BASE_PATH || ''
        }
    },
    vitePlugin: {
        inspector: {
            toggleButtonPos: 'bottom-right',
            showToggleButton: 'always',
            holdMode: true
        }
    }
};

export default config;
