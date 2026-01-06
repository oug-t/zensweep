import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { THEMES, type Theme } from './themes';

const DEFAULT_THEME = THEMES[3];

const savedThemeName = browser ? localStorage.getItem('zsweep_theme') : null;
const initialTheme = THEMES.find((t) => t.name === savedThemeName) || DEFAULT_THEME;

export const currentTheme = writable<Theme>(initialTheme);

currentTheme.subscribe((theme) => {
	if (browser) {
		const root = document.documentElement;
		root.style.setProperty('--bg', theme.colors.bg);
		root.style.setProperty('--main', theme.colors.main);
		root.style.setProperty('--sub', theme.colors.sub);
		root.style.setProperty('--text', theme.colors.text);
		root.style.setProperty('--error', theme.colors.error);

		localStorage.setItem('zsweep_theme', theme.name);
	}
});
