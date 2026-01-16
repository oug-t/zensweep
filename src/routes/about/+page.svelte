<script lang="ts">
	import {
		Bomb,
		Trophy,
		Keyboard,
		Info,
		Palette,
		User,
		LogOut,
		Mail,
		Github,
		Code2,
		GitPullRequest,
		Cpu
	} from 'lucide-svelte';
	import { currentTheme } from '$lib/themeStore';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';

	export let data;

	let currentUser: string | null = null;

	// --- FORMATTING ---
	const fmtCount = (n: number) => {
		if (n >= 1000000) return (n / 1000000).toFixed(1) + 'm';
		if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
		return n.toLocaleString();
	};

	const formatTime = (seconds: number) => {
		const hours = seconds / 3600;
		if (hours >= 1) return { val: hours.toFixed(1), unit: 'hours' };
		const mins = Math.floor(seconds / 60);
		if (mins >= 1) return { val: mins, unit: 'minutes' };
		return { val: seconds, unit: 'seconds' };
	};

	$: timeObj = formatTime(data.stats.seconds);

	// --- AUTH ---
	onMount(async () => {
		const {
			data: { session }
		} = await supabase.auth.getSession();
		if (session?.user)
			currentUser = session.user.user_metadata.full_name || session.user.email?.split('@')[0];

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, session) => {
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

<div
	class="relative flex min-h-screen flex-col items-center bg-bg p-8 font-mono text-text transition-colors duration-300"
>
	<!-- HEADER / NAVIGATION --> 
    <div
		class="animate-in fade-in slide-in-from-top-4 mb-16 flex w-full max-w-5xl items-center justify-between duration-500"
	>
		<!-- Logo + Home Link --> 
		<a
			href="/"
			class="group flex select-none items-center gap-3 transition-opacity hover:opacity-80"
		>
			<Bomb
				size={28}
				strokeWidth={2.5}
				class="text-main transition-transform group-hover:rotate-12"
			/>
			<div class="flex flex-col">
				<h1 class="text-2xl font-black leading-none tracking-tighter text-text">
					z<span class="text-main">sweep</span>
				</h1>
				<span class="text-[10px] font-bold uppercase tracking-[0.2em] text-sub opacity-50"
					>About</span
				>
			</div>
		</a>

		<!-- User Auth / Profile Button --> 
		<div class="flex items-center gap-6 text-sm">
			{#if currentUser}
				<!-- Logged-in User Menu -->
				<div class="group relative z-20">
					<button
						class="flex items-center gap-2 rounded px-3 py-1.5 text-main transition-all hover:bg-sub/10"
					>
						<User size={16} />
						<span class="font-bold">{currentUser}</span>
					</button>
					<!-- Dropdown for Profile / Logout --> 
					<div
						class="invisible absolute right-0 top-full pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100"
					>
						<div
							class="flex min-w-[160px] flex-col rounded border border-sub/20 bg-bg p-1 font-mono text-sm shadow-xl"
						>
							<a
								href="/profile"
								class="flex items-center gap-2 rounded px-3 py-2 text-sub transition-colors hover:bg-sub/10 hover:text-text"
							>
								<User size={14} /><span>Profile</span>
							</a>
							<div class="my-1 h-[1px] bg-sub/10"></div>
							<button
								on:click={handleLogout}
								class="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sub transition-colors hover:bg-error/10 hover:text-error"
							>
								<LogOut size={14} /><span>Sign Out</span>
							</button>
						</div>
					</div>
				</div>
			{:else}
				<!-- Login Link --> 
				<a
					href="/login"
					class="flex h-8 w-8 items-center justify-center rounded text-sub transition-colors hover:bg-sub/10 hover:text-text"
				>
					<User size={18} />
				</a>
			{/if}
		</div>
	</div>

	<!-- MAIN STATS SECTION --> 
	<div class="animate-in fade-in w-full max-w-4xl duration-700">
		<!-- Summary Stats Grid -->
		<div class="mb-20 grid grid-cols-1 gap-12 text-center md:grid-cols-3">
			<!-- Total Boards Started --> 
			<div class="flex flex-col gap-1">
				<span class="text-[10px] font-bold uppercase tracking-widest text-sub opacity-50"
					>global boards started</span
				>
				<span class="text-5xl font-black text-text">{fmtCount(data.stats.started)}</span>
			</div>

			 <!-- Total Time Sweeping --> 
			<div class="flex flex-col items-center gap-1">
				<span class="mb-2 text-[10px] font-bold uppercase tracking-widest text-sub opacity-50"
					>total time sweeping</span
				>
				<div class="flex flex-col items-center leading-none">
					<span class="text-6xl font-black text-main">{timeObj.val}</span>
					<span class="mt-2 text-xl font-bold text-sub">{timeObj.unit}</span>
				</div>
			</div>

			<!-- Total Boards Cleared -->
			<div class="flex flex-col gap-1">
				<span class="text-[10px] font-bold uppercase tracking-widest text-sub opacity-50"
					>global boards cleared</span
				>
				<span class="text-5xl font-black text-text">{fmtCount(data.stats.completed)}</span>
			</div>
		</div>

		<div class="space-y-20 text-sm leading-relaxed text-sub">
			<!-- PHILOSOPHY SECTION --> 
			<section>
				<h2
					class="mb-6 flex items-center gap-3 text-lg font-black uppercase tracking-tight text-text"
				>
					<Info size={20} class="text-main" /> The Philosophy
				</h2>
				<p class="max-w-3xl text-base">
					Traditional Minesweeper clones rely heavily on mouse inputs, breaking the <span
						class="font-bold text-text">flow state</span
					>.
					<strong class="text-main">zsweep</strong> reimagines the classic logic puzzle as a keyboard-centric
					experience. By implementing Vim-style motions (`hjkl`, `w`, `b`) and instant feedback, we aim
					to create the most efficient and satisfying sweeping engine for developers.
				</p>
			</section>

			<!-- The Stack --> 
			<section>
				<h2
					class="mb-6 flex items-center gap-3 text-lg font-black uppercase tracking-tight text-text"
				>
					<Cpu size={20} class="text-main" /> The Stack
				</h2>
				<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
					<div
						class="flex flex-col gap-2 rounded-lg border border-sub/10 bg-sub/5 p-4 transition-colors hover:border-main/30"
					>
						<span class="font-bold text-text">Svelte 5</span>
						<span class="text-xs">Powered by Runes for fine-grained reactivity.</span>
					</div>
					<div
						class="flex flex-col gap-2 rounded-lg border border-sub/10 bg-sub/5 p-4 transition-colors hover:border-main/30"
					>
						<span class="font-bold text-text">TypeScript</span>
						<span class="text-xs">Strict typing for game logic and state machines.</span>
					</div>
					<div
						class="flex flex-col gap-2 rounded-lg border border-sub/10 bg-sub/5 p-4 transition-colors hover:border-main/30"
					>
						<span class="font-bold text-text">Supabase</span>
						<span class="text-xs">Real-time auth and global leaderboards.</span>
					</div>
					<div
						class="flex flex-col gap-2 rounded-lg border border-sub/10 bg-sub/5 p-4 transition-colors hover:border-main/30"
					>
						<span class="font-bold text-text">Tailwind</span>
						<span class="text-xs">Utility-first styling for theming engine.</span>
					</div>
				</div>
			</section>

			 <!-- Vim Grammar --> 
			<section>
				<h2
					class="mb-6 flex items-center gap-3 text-lg font-black uppercase tracking-tight text-text"
				>
					<Keyboard size={20} class="text-main" /> Vim Grammar
				</h2>
				<div class="grid gap-x-12 gap-y-4 md:grid-cols-2">
					<div class="flex justify-between border-b border-sub/10 pb-2">
						<span>Movement</span>
						<span class="font-mono font-bold text-text">h j k l</span>
					</div>
					<div class="flex justify-between border-b border-sub/10 pb-2">
						<span>Jump Words (Skip Open)</span>
						<span class="font-mono font-bold text-text">w / b</span>
					</div>
					<div class="flex justify-between border-b border-sub/10 pb-2">
						<span>Search Number</span>
						<span class="font-mono font-bold text-text">/ [1-8]</span>
					</div>
					<div class="flex justify-between border-b border-sub/10 pb-2">
						<span>Flag / Reveal</span>
						<span class="font-mono font-bold text-text">Space / Enter</span>
					</div>
					<div class="flex justify-between border-b border-sub/10 pb-2">
						<span>Restart</span>
						<span class="font-mono font-bold text-text">Tab</span>
					</div>
					<div class="flex justify-between border-b border-sub/10 pb-2">
						<span>Command Palette</span>
						<span class="font-mono font-bold text-text">Esc</span>
					</div>
				</div>
			</section>
			
			<!-- OPEN SOURCE & CONTRIBUTORS --> 
			<section class="border-t border-sub/10 pt-16">
				<h2
					class="mb-6 flex items-center gap-3 text-lg font-black uppercase tracking-tight text-text"
				>
					<GitPullRequest size={20} class="text-main" /> Open Source
				</h2>
				<div class="mb-8 flex flex-col gap-4 text-base">
					<p>
						zsweep is fully open source. We are actively looking for contributors to help with
						<strong class="text-text">Mobile Support</strong> (Touch Events) and the
						<strong class="text-text">Chording Animation</strong> engine.
					</p>

					<div class="my-4">
						<span class="mb-4 block text-xs font-bold uppercase tracking-widest text-sub opacity-50"
							>Special thanks to our contributors</span
						>
						<a
							href="https://github.com/oug-t/zsweep/graphs/contributors"
							class="inline-block transition-opacity hover:opacity-80"
						>
							<img
								src="https://contrib.rocks/image?repo=oug-t/zsweep"
								alt="Contributors"
								class="h-12"
							/>
						</a>
					</div>
				</div>
				
				<!-- GitHub Links --> 
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<a
						href="https://github.com/oug-t/zsweep"
						target="_blank"
						class="group flex items-center justify-center gap-3 rounded-lg border border-sub/20 bg-sub/5 px-6 py-4 text-text transition-all hover:border-main hover:bg-sub/10"
					>
						<Github size={20} class="transition-transform group-hover:scale-110" />
						<div class="flex flex-col items-start">
							<span class="font-bold">GitHub Repository</span>
							<span class="text-xs text-sub group-hover:text-main">Star, Fork, & Contribute</span>
						</div>
					</a>
					<a
						href="https://github.com/oug-t/zsweep/issues"
						target="_blank"
						class="group flex items-center justify-center gap-3 rounded-lg border border-sub/20 bg-sub/5 px-6 py-4 text-text transition-all hover:border-main hover:bg-sub/10"
					>
						<Code2 size={20} class="transition-transform group-hover:scale-110" />
						<div class="flex flex-col items-start">
							<span class="font-bold">View Roadmap</span>
							<span class="text-xs text-sub group-hover:text-main">Help us build v1.1</span>
						</div>
					</a>
				</div>
			</section>
		</div>
	</div>

	<div
		class="pointer-events-none fixed bottom-6 left-0 right-0 flex w-full select-none justify-between px-8"
	>
		<div
			class="flex flex-col gap-2 text-[10px] font-bold uppercase tracking-widest text-sub opacity-40"
		>
			<div class="flex items-center gap-3">
				<kbd
					class="flex min-w-[36px] justify-center rounded bg-sub/20 px-1.5 py-0.5 font-mono text-text shadow-sm"
					>tab</kbd
				>
				<span class="h-[1px] w-3 bg-sub/30"></span>
				<span>Home</span>
			</div>
		</div>

		<div
			class="flex flex-col justify-end text-right text-[10px] font-bold uppercase tracking-widest text-sub opacity-40"
		>
			<div class="flex items-center gap-2">
				<span>{$currentTheme?.label || 'default'}</span>
				<Palette size={10} />
			</div>
		</div>
	</div>
</div>
