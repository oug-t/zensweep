import type { Config } from 'tailwindcss';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				bg: 'rgb(var(--bg) / <alpha-value>)',
				main: 'rgb(var(--main) / <alpha-value>)',
				sub: 'rgb(var(--sub) / <alpha-value>)',
				text: 'rgb(var(--text) / <alpha-value>)',
				error: 'rgb(var(--error) / <alpha-value>)'
			},
			fontFamily: {
				mono: ['JetBrains Mono', 'monospace'] // Optional: Monkeytype font
			}
		}
	},
	plugins: []
} satisfies Config;
