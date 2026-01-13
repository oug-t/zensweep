<script lang="ts">
	import { Bomb, Trophy, Keyboard, Info, Palette, User, LogOut, Mail, Github } from 'lucide-svelte';
	import { currentTheme } from '$lib/themeStore';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';

	// --- PROPS (Svelte 4 Style) ---
	export let data; 

	let currentUser: string | null = null;

	// --- FORMATTING LOGIC ---
	const fmtCount = (n: number) => {
		if (n >= 1000000) return (n / 1000000).toFixed(1) + 'm';
		if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
		return n.toLocaleString();
	};

    const formatTime = (seconds: number) => {
        const hours = seconds / 3600;
        // This ensures 8.84 becomes "8.8"
        if (hours >= 1) {
            return { val: hours.toFixed(1), unit: 'hours' };
        }
        const mins = Math.floor(seconds / 60);
        if (mins >= 1) return { val: mins, unit: 'minutes' };
        return { val: seconds, unit: 'seconds' };
    };

    // --- REACTIVE DECLARATION (Svelte 4 Style) ---
    // This replaces $derived() to fix your "runes mode" error
    $: timeObj = formatTime(data.stats.seconds);

	// --- AUTH LOGIC ---
	onMount(async () => {
		const { data: { session } } = await supabase.auth.getSession();
		if (session?.user) {
			currentUser = session.user.user_metadata.full_name || session.user.email?.split('@')[0];
		}
		const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
			currentUser = session?.user
				? session.user.user_metadata.full_name || session.user.email?.split('@')[0]
				: null;
		});
		return () => subscription.unsubscribe();
	});

	async function handleLogout() {
		await supabase.auth.signOut();
		currentUser = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Tab') {
			e.preventDefault();
			goto('/');
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="relative flex min-h-screen flex-col items-center bg-bg p-8 font-mono text-text transition-colors duration-300">
    <div class="animate-in fade-in slide-in-from-top-4 mb-16 flex w-full max-w-5xl items-center justify-between duration-500">
		<a href="/" class="flex select-none items-center gap-2 transition-opacity hover:opacity-80">
			<Bomb size={24} class="text-main" />
			<h1 class="text-2xl font-bold tracking-tight text-text">
				z<span class="text-main">sweep</span>
			</h1>
		</a>

		<div class="flex items-center gap-6 text-sm">
			{#if currentUser}
				<div class="group relative z-20">
					<button class="flex items-center gap-2 rounded px-3 py-1.5 text-main transition-all hover:bg-sub/10">
						<User size={16} />
						<span class="font-bold">{currentUser}</span>
					</button>
					<div class="invisible absolute right-0 top-full pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
						<div class="flex min-w-[160px] flex-col rounded border border-sub/20 bg-bg p-1 font-mono text-sm shadow-xl">
							<a href="/profile" class="flex items-center gap-2 rounded px-3 py-2 text-sub transition-colors hover:bg-sub/10 hover:text-text">
								<User size={14} />
								<span>Profile</span>
							</a>
							<div class="my-1 h-[1px] bg-sub/10"></div>
							<button on:click={handleLogout} class="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sub transition-colors hover:bg-error/10 hover:text-error">
								<LogOut size={14} />
								<span>Sign Out</span>
							</button>
						</div>
					</div>
				</div>
			{:else}
				<a href="/login" class="flex h-8 w-8 items-center justify-center rounded text-sub transition-colors hover:bg-sub/10 hover:text-text">
					<User size={18} />
				</a>
			{/if}
		</div>
	</div>

	<div class="animate-in fade-in w-full max-w-4xl duration-700">
		<div class="mb-24 grid grid-cols-1 gap-12 text-center md:grid-cols-3">
			<div class="flex flex-col gap-1">
				<span class="text-xs font-bold uppercase tracking-widest text-sub">total boards started</span>
				<span class="text-5xl font-bold text-text">{fmtCount(data.stats.started)}</span>
			</div>
            
            <div class="flex flex-col gap-1 items-center">
				<span class="text-xs font-bold uppercase tracking-widest text-sub mb-2">total time sweeping</span>
				<div class="flex flex-col items-center leading-none">
					<span class="text-6xl font-bold text-text">{timeObj.val}</span>
					<span class="text-3xl font-medium text-text mt-1">{timeObj.unit}</span>
				</div>
			</div>

			<div class="flex flex-col gap-1">
				<span class="text-xs font-bold uppercase tracking-widest text-sub">total boards completed</span>
				<span class="text-5xl font-bold text-text">{fmtCount(data.stats.completed)}</span>
			</div>
		</div>

        <div class="space-y-24 text-sm leading-relaxed text-sub">
			<section>
				<h2 class="mb-6 flex items-center gap-2 font-bold uppercase tracking-tight text-text">
					<Info size={16} class="text-main" /> about
				</h2>
				<p class="max-w-2xl">
					Zsweep is a minimalist and customizable minesweeper game. It features many game modes, an
					account system to save your sweeping history, and user-configurable features such as
					themes and sounds.
				</p>
			</section>

			<section>
				<h2 class="mb-6 flex items-center gap-2 font-bold uppercase tracking-tight text-text">
					<Keyboard size={16} class="text-main" /> keybinds
				</h2>
				<p>
					You can use <kbd class="rounded bg-sub/20 px-1.5 py-0.5 font-bold text-text">tab</kbd> to
					return to the home page.
				</p>
			</section>

			<section>
				<h2 class="mb-6 flex items-center gap-2 font-bold uppercase tracking-tight text-text">
					<Trophy size={16} class="text-main" /> stats
				</h2>
				<div class="space-y-4">
					<p><span class="font-bold text-text">accuracy</span> — percentage of safe cells clicked.</p>
					<p><span class="font-bold text-text">cells swept</span> — total volume of the grid cleared.</p>
				</div>
			</section>

			<section class="border-t border-sub/10 pb-24 pt-12">
				<h2 class="mb-6 flex items-center gap-2 font-bold uppercase tracking-tight text-text">
					<Mail size={16} class="text-main" /> contact
				</h2>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<a href="mailto:tommyguo024@outlook.com" class="flex items-center justify-center gap-3 rounded-lg bg-sub/5 px-6 py-4 text-text transition-colors hover:bg-sub/10">
						<Mail size={18} />
						<span class="font-bold">email</span>
					</a>
					<a href="https://github.com/oug-t/zsweep" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-3 rounded-lg bg-sub/5 px-6 py-4 text-text transition-colors hover:bg-sub/10">
						<Github size={18} />
						<span class="font-bold">github</span>
					</a>
				</div>
			</section>
		</div>
	</div>

    <div class="fixed bottom-8 flex w-full justify-between px-8 text-[10px] text-sub opacity-40">
		<div class="flex gap-6">
			<div class="flex items-center gap-2">
				<kbd class="rounded bg-sub/20 px-1.5 py-0.5 text-text">tab</kbd>
				<span>- home</span>
			</div>
		</div>
		<div class="flex gap-6">
			<div class="flex items-center gap-2">
				<Palette size={12} />
				<span>{$currentTheme?.label || 'default'}</span>
			</div>
			<span>v1.0.0</span>
		</div>
	</div>
</div>

<style>
	kbd {
		font-family: inherit;
	}
</style>
