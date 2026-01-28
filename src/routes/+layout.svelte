<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Bomb, User, LogOut, BookOpen, Info, Palette } from 'lucide-svelte';

	import { supabase } from '$lib/supabase';
	import { currentTheme } from '$lib/themeStore';

	import CommandPalette from '$lib/components/CommandPalette.svelte';

	let currentUser: string | null = null;
	let showPalette = false;

	// Track seen state individually for each icon
	let seenState = {
		about: true,
		manual: true
	};

	function handleGlobalKeydown(e: KeyboardEvent) {
		if (e.key === ':') {
			e.preventDefault();
			showPalette = !showPalette;
			return;
		}

		if (e.key === 'Escape' || (e.ctrlKey && (e.key === '[' || e.key === 'c'))) {
			if (showPalette) {
				e.preventDefault();
				showPalette = false;
				e.stopPropagation();
				return;
			}
		}

		if (e.key === 'Tab') {
			const active = document.activeElement;
			const isInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;

			if (!isInput && $page.url.pathname !== '/') {
				e.preventDefault();
				goto('/');
			}
		}
	}

	function markAsSeen(key: 'about' | 'manual') {
		if (!seenState[key]) {
			seenState[key] = true;
			localStorage.setItem(`zsweep-seen-${key}`, 'true');
		}
	}

	onMount(() => {
		const aboutSeen = localStorage.getItem('zsweep-seen-about');
		const manualSeen = localStorage.getItem('zsweep-seen-manual');

		seenState = {
			about: !!aboutSeen,
			manual: !!manualSeen
		};

		supabase.auth.getSession().then(({ data: { session } }) => {
			if (session?.user) {
				currentUser = session.user.user_metadata.full_name || session.user.email?.split('@')[0];
			}
		});

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
</script>

<svelte:window on:keydown={handleGlobalKeydown} />

<svelte:head>
	<link
		rel="icon"
		type="image/svg+xml"
		href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23B39DDB' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-bomb-icon lucide-bomb'%3E%3Ccircle cx='11' cy='13' r='9'/%3E%3Cpath d='M14.35 4.65 16.3 2.7a2.41 2.41 0 0 1 3.4 0l1.6 1.6a2.4 2.4 0 0 1 0 3.4l-1.95 1.95'/%3E%3Cpath d='m22 2-1.5 1.5'/%3E%3C/svg%3E"
	/>
	<title>Zsweep</title>
	<meta
		name="description"
		content="A modern, minimalistic minesweeper game inspired by Monkeytype."
	/>
	<meta name="theme-color" content="#323437" />
</svelte:head>

<div class="relative min-h-screen bg-bg pb-20 font-mono text-text transition-colors duration-300">
	<header class="flex w-full items-center justify-between p-8">
		<div class="flex items-center gap-5">
			<a
				href="/"
				class="group flex select-none items-center gap-3 transition-opacity hover:opacity-80"
			>
				<Bomb
					size={32}
					strokeWidth={2.5}
					class="text-main transition-transform group-hover:rotate-12"
				/>
				<div class="flex flex-col">
					<h1 class="text-3xl font-black leading-none tracking-tighter text-text">
						z<span class="text-main">sweep</span>
					</h1>
				</div>
			</a>

			<div class="flex items-center gap-2">
				<a
					href="/about"
					on:click={() => markAsSeen('about')}
					class="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-sub/10 hover:text-text {$page
						.url.pathname === '/about'
						? 'bg-sub/10 text-text'
						: !seenState.about
							? 'animate-pulse text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]'
							: 'text-sub'}"
					title="About"
				>
					<Info size={22} />
				</a>

				<a
					href="/help"
					on:click={() => markAsSeen('manual')}
					class="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-sub/10 hover:text-text {$page
						.url.pathname === '/help'
						? 'bg-sub/10 text-text'
						: !seenState.manual
							? 'animate-pulse text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]'
							: 'text-sub'}"
					title="Manual / Help"
				>
					<BookOpen size={22} />
				</a>
			</div>
		</div>

		<div class="flex items-center gap-6 text-sm transition-opacity duration-300">
			{#if currentUser}
				<div class="group relative z-20">
					<button
						title="Go to Profile"
						class="flex items-center gap-2 rounded px-3 py-1.5 text-main transition-all hover:bg-sub/10"
					>
						<User size={16} />
						<span class="font-bold">{currentUser}</span>
					</button>
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
				<a
					href="/login"
					class="flex h-8 w-8 items-center justify-center rounded text-sub hover:bg-sub/10 hover:text-text"
				>
					<User size={18} />
				</a>
			{/if}
		</div>
	</header>

	<main class="w-full">
		<slot />
	</main>

	<CommandPalette bind:show={showPalette} />

	<div class="pointer-events-none fixed bottom-6 left-0 right-0 z-50 px-8">
		<div class="flex w-full select-none justify-between">
			<div class="flex flex-col gap-2 text-[10px] font-bold tracking-widest text-sub opacity-60">
				<div class="flex items-center gap-3">
					<kbd
						class="flex min-w-[36px] justify-center rounded bg-sub/20 px-1.5 py-0.5 font-mono text-text shadow-sm"
						>tab</kbd
					>
					<span class="h-[1px] w-3 bg-sub/30"></span>
					<span>restart</span>
				</div>

				<div class="flex items-center gap-3">
					<kbd
						class="flex min-w-[36px] justify-center rounded bg-sub/20 px-1.5 py-0.5 font-mono text-text shadow-sm"
						>spc</kbd
					>
					<span class="h-[1px] w-3 bg-sub/30"></span>
					<span>flag/chord</span>
				</div>

				<div class="flex items-center gap-3">
					<kbd
						class="flex min-w-[36px] justify-center rounded bg-sub/20 px-1.5 py-0.5 font-mono text-text shadow-sm"
						>:</kbd
					>
					<span class="h-[1px] w-3 bg-sub/30"></span>
					<span>palette</span>
				</div>
			</div>

			<div
				class="flex flex-col justify-end text-right text-[10px] font-bold uppercase tracking-widest text-sub opacity-60"
			>
				<div class="flex items-center gap-2">
					<span>{$currentTheme?.label || 'default'}</span>
					<Palette size={10} />
				</div>
			</div>
		</div>
	</div>
</div>
