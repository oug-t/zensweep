<script lang="ts">
	import { User, Check, Bomb, ArrowLeft } from 'lucide-svelte';
	import { supabase } from '$lib/supabase';

	let loading = false;

	// --- LOGIN STATE ---
	let loginEmail = '';
	let loginPassword = '';
	let rememberMe = true;

	// --- REGISTER STATE ---
	let regUsername = '';
	let regEmail = '';
	let regPassword = '';
	let regVerifyPassword = '';

	async function signInWithProvider(provider: 'google' | 'github') {
		loading = true;
		const { error } = await supabase.auth.signInWithOAuth({
			provider,
			options: { redirectTo: window.location.origin }
		});
		if (error) alert(error.message);
		loading = false;
	}

	async function handleLogin() {
		if (!loginEmail || !loginPassword) return alert('Please fill in all fields');
		loading = true;

		const { error } = await supabase.auth.signInWithPassword({
			email: loginEmail,
			password: loginPassword
		});

		if (error) {
			alert(error.message);
			loading = false;
		} else {
			window.location.href = '/';
		}
	}

	async function handleRegister() {
		if (!regEmail || !regPassword || !regUsername) return alert('Please fill in all fields');
		if (regPassword !== regVerifyPassword) return alert('Passwords do not match');

		loading = true;

		const { error } = await supabase.auth.signUp({
			email: regEmail,
			password: regPassword,
			options: { data: { full_name: regUsername } }
		});

		if (error) alert(error.message);
		else alert('Registration successful! You can now log in.');
		loading = false;
	}

	// --- GLOBAL KEYBOARD SHORTCUTS ---
	function handleGlobalKeydown(e: KeyboardEvent) {
		if (e.key === 'Tab') {
			const active = document.activeElement;
			// If focus is inside an input, let default Tab behavior work (next field)
			if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
				return;
			}

			// Otherwise, "Restart" (Go back to game)
			e.preventDefault();
			window.location.href = '/';
		}
	}
</script>

<svelte:window on:keydown={handleGlobalKeydown} />

<div class="relative flex min-h-screen flex-col items-center bg-bg font-mono text-text">
	<div
		class="animate-in fade-in slide-in-from-top-4 mb-8 flex w-full max-w-5xl items-center justify-between p-8 duration-500"
	>
		<a href="/" class="flex select-none items-center gap-2 transition-opacity hover:opacity-80">
			<Bomb size={24} class="text-main" />
			<h1 class="text-2xl font-bold tracking-tight text-text">
				z<span class="text-main">sweep</span>
			</h1>
		</a>

		<a
			href="/"
			class="flex h-8 w-8 items-center justify-center rounded text-sub transition-colors hover:bg-sub/10 hover:text-text"
		>
			<User size={18} />
		</a>
	</div>

	<div
		class="animate-in fade-in zoom-in z-10 grid w-full max-w-4xl grid-cols-1 gap-16 px-4 duration-300 md:grid-cols-2 md:gap-32"
	>
		<div class="flex flex-col gap-6">
			<div class="mb-2 flex items-center gap-2 text-sub">
				<User size={16} />
				<span class="font-bold">register</span>
			</div>

			<div class="space-y-3">
				<input
					type="text"
					placeholder="username"
					bind:value={regUsername}
					class="w-full rounded border-none bg-sub/10 p-3 text-sm text-text outline-none transition-all placeholder:text-sub/40 focus:ring-2 focus:ring-main"
				/>
				<input
					type="email"
					placeholder="email"
					bind:value={regEmail}
					class="w-full rounded border-none bg-sub/10 p-3 text-sm text-text outline-none transition-all placeholder:text-sub/40 focus:ring-2 focus:ring-main"
				/>
				<input
					type="password"
					placeholder="password"
					bind:value={regPassword}
					class="w-full rounded border-none bg-sub/10 p-3 text-sm text-text outline-none transition-all placeholder:text-sub/40 focus:ring-2 focus:ring-main"
				/>
				<input
					type="password"
					placeholder="verify password"
					bind:value={regVerifyPassword}
					class="w-full rounded border-none bg-sub/10 p-3 text-sm text-text outline-none transition-all placeholder:text-sub/40 focus:ring-2 focus:ring-main"
				/>

				<button
					on:click={handleRegister}
					disabled={loading}
					class="mt-4 flex w-full items-center justify-center gap-2 rounded bg-sub/20 py-3 text-sm font-bold text-sub transition-colors hover:bg-main hover:text-bg"
				>
					<User size={16} />
					<span>{loading ? 'processing...' : 'sign up'}</span>
				</button>
			</div>
		</div>

		<div class="flex flex-col gap-6">
			<div class="mb-2 flex items-center gap-2 text-sub">
				<span class="font-bold">login</span>
			</div>

			<div class="mb-2 grid grid-cols-2 gap-4">
				<button
					on:click={() => signInWithProvider('google')}
					disabled={loading}
					class="flex h-12 items-center justify-center rounded bg-sub/10 text-sub transition-colors hover:bg-sub/20 hover:text-text"
					title="Sign in with Google"
				>
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"
						><path
							d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
						/></svg
					>
				</button>
				<button
					on:click={() => signInWithProvider('github')}
					disabled={loading}
					class="flex h-12 items-center justify-center rounded bg-sub/10 text-sub transition-colors hover:bg-sub/20 hover:text-text"
					title="Sign in with GitHub"
				>
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"
						><path
							d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
						/></svg
					>
				</button>
			</div>

			<div class="relative my-2 flex items-center justify-center">
				<div class="h-[1px] w-full bg-sub/10"></div>
				<span class="absolute bg-bg px-2 text-xs text-sub opacity-50">or</span>
			</div>

			<div class="space-y-3">
				<input
					type="email"
					placeholder="email"
					bind:value={loginEmail}
					class="w-full rounded border-none bg-sub/10 p-3 text-sm text-text outline-none transition-all placeholder:text-sub/40 focus:ring-2 focus:ring-main"
				/>
				<input
					type="password"
					placeholder="password"
					bind:value={loginPassword}
					class="w-full rounded border-none bg-sub/10 p-3 text-sm text-text outline-none transition-all placeholder:text-sub/40 focus:ring-2 focus:ring-main"
				/>

				<div class="mt-1 flex items-center justify-between text-xs">
					<button
						class="flex select-none items-center gap-2 text-sub transition-colors hover:text-main"
						on:click={() => (rememberMe = !rememberMe)}
					>
						<div
							class="flex h-4 w-4 items-center justify-center rounded bg-sub/10 {rememberMe
								? 'text-main'
								: 'text-transparent'}"
						>
							<Check size={10} strokeWidth={4} />
						</div>
						<span>remember me</span>
					</button>
					<a href="#" class="text-sub opacity-50 transition-opacity hover:opacity-100"
						>forgot password?</a
					>
				</div>

				<button
					on:click={handleLogin}
					disabled={loading}
					class="mt-4 flex w-full items-center justify-center gap-2 rounded bg-sub/20 py-3 text-sm font-bold text-sub transition-colors hover:bg-main hover:text-bg"
				>
					<svg
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline
							points="10 17 15 12 10 7"
						/><line x1="15" y1="12" x2="3" y2="12" /></svg
					>
					<span>{loading ? 'signing in...' : 'sign in'}</span>
				</button>
			</div>
		</div>
	</div>

	<div class="fixed bottom-8 flex gap-6 font-mono text-xs text-sub opacity-40">
		<div class="flex items-center gap-2">
			<kbd class="rounded bg-sub/20 px-1.5 py-0.5 text-text">tab</kbd>
			<span>- restart</span>
		</div>
		<div class="flex items-center gap-2">
			<kbd class="rounded bg-sub/20 px-1.5 py-0.5 text-text">esc</kbd>
			<span>- search</span>
		</div>
	</div>
</div>
