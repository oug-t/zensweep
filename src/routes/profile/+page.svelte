<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import {
		User,
		Trophy,
		Calendar,
		Clock,
		Download,
		Bomb,
		LogOut,
		Search,
		ChevronRight,
		Activity,
		Zap
	} from 'lucide-svelte';
	import { currentTheme } from '$lib/themeStore';
	import { THEMES } from '$lib/themes';

	// 1. Helper to force ANY value into a valid number (prevents NaN)
	const safeNum = (val: any) => {
		if (val === null || val === undefined) return 0;
		const n = Number(val);
		return isNaN(n) ? 0 : n;
	};

	let loading = true;
	let profile: any = null;
	let history: any[] = [];
	let currentUser: string | null = null;

	// Command Palette
	let showPalette = false;
	let paletteView: 'root' | 'themes' = 'root';
	let searchQuery = '';
	let searchInputEl: HTMLInputElement;

	$: filteredThemes = THEMES.filter((t) =>
		t.label.toLowerCase().includes(searchQuery.toLowerCase())
	);
	const COMMANDS = [
		{
			id: 'theme',
			label: 'Theme...',
			icon: Trophy,
			action: () => {
				paletteView = 'themes';
				searchQuery = '';
				searchInputEl?.focus();
			}
		}
	];
	$: filteredCommands = COMMANDS.filter((c) =>
		c.label.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Stats State
	let stats = {
		started: 0,
		completed: 0,
		timeSweeping: '00:00:00',
		totalMinesSwept: 0,
		completionRate: 0
	};

	let bests: any[] = [];
	let best3BVs: Record<string, { value: number; date: string }> = {};
	let heatmapData: { date: string; count: number; intensity: number }[] = [];

	onMount(async () => {
		const {
			data: { user }
		} = await supabase.auth.getUser();
		if (!user) {
			goto('/login');
			return;
		}

		const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
		profile = p;
		currentUser = p?.username;

		const { data: r } = await supabase
			.from('game_results')
			.select('*')
			.eq('user_id', user.id)
			.order('created_at', { ascending: false });

		if (r) {
			history = r;
			stats = calculateStats(r);
			generateHeatmap(r);
		}
		loading = false;
	});

	function calculateStats(data: any[]) {
		const newStats = {
			started: 0,
			completed: 0,
			timeSweeping: '00:00:00',
			totalMinesSwept: 0,
			completionRate: 0
		};

		newStats.started = data.length;
		newStats.completed = data.filter((g) => g.win).length;
		newStats.completionRate =
			newStats.started > 0 ? Math.round((newStats.completed / newStats.started) * 100) : 0;

		let totalSeconds = 0;
		let minesSweptCount = 0;
		const groups: Record<string, any> = {};
		const categories = ['15', '30', '60', '120', '9x9', '16x16', '30x16'];
		categories.forEach((c) => (best3BVs[c] = { value: 0, date: '' }));

		data.forEach((g) => {
			// --- TIME CALCULATION ---
			let timeTaken = 0;

			// 1. Try new 'time' column
			if (g.time !== undefined && g.time !== null) {
				timeTaken = safeNum(g.time);
			}
			// 2. Fallback for Time Attack (setting is the time)
			else if (g.mode === 'time') {
				timeTaken = parseInt(g.setting) || 15;
			}
			// 3. Fallback for old Standard games (use 0 if score is gone)
			else {
				timeTaken = 0;
			}

			timeTaken = safeNum(timeTaken);
			totalSeconds += timeTaken;

			// --- MINES CALCULATION ---
			if (g.win) {
				let mines = safeNum(g.total_mines);

				// If DB value is missing (old data), estimate it
				if (mines === 0) {
					if (g.mode === 'standard') {
						if (g.setting === '9x9') mines = 10;
						else if (g.setting === '16x16') mines = 40;
						else if (g.setting === '30x16') mines = 99;
						else mines = 10;
					} else {
						// Time Mode: grids * 10 (Use 'grids' column only)
						const grids = safeNum(g.grids);
						mines = grids * 10;
					}
				}
				minesSweptCount += mines;
			}

			// --- BEST 3BV ---
			if (g.win && g.total_3bv && timeTaken > 0) {
				const bbbPerSec = parseFloat((g.total_3bv / timeTaken).toFixed(2));
				const cat = g.setting;
				if (best3BVs[cat] && bbbPerSec > best3BVs[cat].value) {
					best3BVs[cat] = { value: bbbPerSec, date: g.created_at };
				}
			}

			// --- PERSONAL BESTS ---
			if (g.win) {
				const key = `${g.mode === 'time' ? 'Time' : 'Std'} ${g.setting}`;
				let scoreValue = 0;
				if (g.mode === 'time') {
					scoreValue = safeNum(g.grids);
				} else {
					scoreValue = safeNum(g.time) || 9999;
				}

				if (!groups[key]) {
					groups[key] = {
						label: key,
						score: scoreValue,
						acc: g.accuracy,
						mode: g.mode,
						date: g.created_at
					};
				} else {
					const isBetter =
						g.mode === 'time' ? scoreValue > groups[key].score : scoreValue < groups[key].score;

					if (isBetter) {
						groups[key] = {
							label: key,
							score: scoreValue,
							acc: g.accuracy,
							mode: g.mode,
							date: g.created_at
						};
					}
				}
			}
		});

		newStats.totalMinesSwept = minesSweptCount;

		// --- FORMAT TIME ---
		const safeTotal = safeNum(totalSeconds);
		if (safeTotal > 0) {
			const h = Math.floor(safeTotal / 3600)
				.toString()
				.padStart(2, '0');
			const m = Math.floor((safeTotal % 3600) / 60)
				.toString()
				.padStart(2, '0');
			const s = (safeTotal % 60).toString().padStart(2, '0');
			newStats.timeSweeping = `${h}:${m}:${s}`;
		} else {
			newStats.timeSweeping = '00:00:00';
		}

		bests = Object.values(groups);
		return newStats;
	}

	function generateHeatmap(data: any[]) {
		const today = new Date();
		const days = [];
		for (let i = 364; i >= 0; i--) {
			const d = new Date();
			d.setDate(today.getDate() - i);
			const dateStr = d.toISOString().split('T')[0];
			const count = data.filter((g) => g.created_at.startsWith(dateStr)).length;
			let intensity = 0;
			if (count > 0) intensity = 1;
			if (count > 2) intensity = 2;
			if (count > 5) intensity = 3;
			if (count > 10) intensity = 4;
			days.push({ date: dateStr, count, intensity });
		}
		heatmapData = days;
	}

	async function handleLogout() {
		await supabase.auth.signOut();
		window.location.href = '/login';
	}

	function handleInput(e: KeyboardEvent) {
		if (showPalette) {
			if (e.key === 'Escape') showPalette = false;
			return;
		}
		if (e.key === 'Tab') {
			e.preventDefault();
			goto('/');
		}
		if (e.key === 'Escape') {
			showPalette = true;
			paletteView = 'root';
			setTimeout(() => searchInputEl?.focus(), 50);
		}
	}
</script>

<svelte:window on:keydown={handleInput} />

<div
	class="relative flex min-h-screen flex-col items-center bg-bg font-mono text-text transition-colors duration-300"
>
	<div
		class="animate-in fade-in slide-in-from-top-4 mb-0 flex w-full max-w-5xl items-center justify-between p-8 duration-500"
	>
		<div class="flex items-center gap-4 transition-all duration-300">
			<a href="/" class="group flex select-none items-center gap-3 transition-all hover:opacity-80">
				<Bomb
					size={28}
					strokeWidth={2.5}
					class="text-main transition-transform duration-300 group-hover:scale-110"
				/>
				<h1 class="font-mono text-3xl font-black leading-none tracking-tighter text-text">
					z<span class="text-main">sweep</span>
				</h1>
			</a>
		</div>

		<div class="flex items-center gap-6 text-sm">
			<div class="group relative z-20">
				<button
					class="flex items-center gap-2 rounded bg-sub/10 px-3 py-1.5 text-main transition-all"
				>
					<User size={16} />
					<span class="font-bold">{currentUser || 'Loading...'}</span>
				</button>
				<div
					class="invisible absolute right-0 top-full pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100"
				>
					<div
						class="flex min-w-[160px] flex-col rounded border border-sub/20 bg-bg p-1 font-mono text-sm shadow-xl"
					>
						<button
							on:click={handleLogout}
							class="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sub transition-colors hover:bg-error/10 hover:text-error"
						>
							<LogOut size={14} />
							<span>Sign Out</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>

	{#if loading}
		<div class="mt-20 animate-pulse text-sub">loading profile...</div>
	{:else}
		<div class="flex w-full max-w-5xl flex-col px-8 pb-32">
			<div
				class="animate-in fade-in mb-8 flex w-full flex-col items-stretch justify-between gap-8 rounded-lg border border-sub/10 bg-sub/5 p-8 delay-75 duration-500 md:flex-row"
			>
				<div class="flex items-center gap-6">
					<div
						class="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-sub/20"
					>
						{#if profile?.avatar_url}
							<img src={profile.avatar_url} alt="avatar" class="h-full w-full object-cover" />
						{:else}
							<User size={48} class="text-sub" />
						{/if}
					</div>
					<div class="flex flex-col">
						<h1 class="text-3xl font-bold text-text">{profile?.username || 'Guest'}</h1>
						<div class="mt-2 flex items-center gap-2 text-xs font-bold text-sub">
							<Calendar size={12} /> Joined {new Date(profile?.created_at).toLocaleDateString()}
						</div>
						<div class="mt-6 flex gap-8">
							<div>
								<div class="text-[10px] font-bold uppercase text-sub opacity-70">started</div>
								<div class="text-xl font-bold text-text">{stats.started}</div>
							</div>
							<div>
								<div class="text-[10px] font-bold uppercase text-sub opacity-70">completed</div>
								<div class="text-xl font-bold text-text">
									{stats.completed}
									<span class="text-xs font-normal text-sub">({stats.completionRate}%)</span>
								</div>
							</div>
							<div>
								<div class="text-[10px] font-bold uppercase text-sub opacity-70">time sweeping</div>
								<div class="text-xl font-bold text-text">{stats.timeSweeping}</div>
							</div>
						</div>
					</div>
				</div>
				<div
					class="flex flex-col items-end justify-center border-l border-sub/10 pl-8 text-right md:pl-16"
				>
					<span class="mb-2 text-xs font-bold uppercase tracking-widest text-sub">
						estimated mines swept
					</span>
					<span class="text-7xl font-bold leading-none text-main">
						{stats.totalMinesSwept}
					</span>
				</div>
			</div>

			<div class="animate-in fade-in mb-8 w-full delay-150 duration-500">
				<div class="mb-2 flex items-center justify-between">
					<h3 class="flex items-center gap-2 text-xs font-bold uppercase text-sub opacity-70">
						<Zap size={14} /> Best 3BV/s
					</h3>
				</div>
				<div class="mb-4 grid w-full grid-cols-4 gap-4">
					{#each ['15', '30', '60', '120'] as time}
						<div class="flex flex-col items-start rounded-lg border border-sub/10 bg-sub/5 p-4">
							<div class="mb-1 text-[10px] font-bold uppercase text-sub opacity-70">
								{time} Seconds
							</div>
							<div class="text-2xl font-bold leading-none text-text">
								{best3BVs[time]?.value || '-'}
							</div>
							<div class="mt-1 text-[10px] text-sub opacity-50">
								{best3BVs[time]?.value ? new Date(best3BVs[time].date).toLocaleDateString() : 'N/A'}
							</div>
						</div>
					{/each}
				</div>
				<div class="grid w-full grid-cols-3 gap-4">
					{#each ['9x9', '16x16', '30x16'] as size}
						<div class="flex flex-col items-start rounded-lg border border-sub/10 bg-sub/5 p-4">
							<div class="mb-1 text-[10px] font-bold uppercase text-sub opacity-70">
								{size} Standard
							</div>
							<div class="text-2xl font-bold leading-none text-text">
								{best3BVs[size]?.value || '-'}
							</div>
							<div class="mt-1 text-[10px] text-sub opacity-50">
								{best3BVs[size]?.value ? new Date(best3BVs[size].date).toLocaleDateString() : 'N/A'}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="animate-in fade-in mb-8 w-full delay-150 duration-500">
				<div class="mb-2 flex items-center justify-between">
					<h3 class="flex items-center gap-2 text-xs font-bold uppercase text-sub opacity-70">
						<Trophy size={14} /> Personal Bests
					</h3>
				</div>
				<div
					class="grid w-full grid-cols-2 gap-4 rounded-lg border border-sub/10 bg-sub/5 p-4 md:grid-cols-4"
				>
					{#if bests.length > 0}
						{#each bests.slice(0, 4) as item}
							<div
								class="flex flex-col items-center border-r border-sub/10 p-2 last:border-0 md:items-start"
							>
								<div class="mb-1 text-[10px] font-bold uppercase text-sub opacity-70">
									{item.label}
								</div>
								<div class="mb-1 text-3xl font-bold leading-none text-text">{item.score}</div>
								<div class="text-[10px] font-medium text-main">{item.acc}% accuracy</div>
							</div>
						{/each}
					{:else}
						<div class="col-span-4 py-4 text-center text-xs italic text-sub opacity-50">
							No personal bests yet. Complete a game to see stats here!
						</div>
					{/if}
				</div>
			</div>

			<div class="animate-in fade-in mb-8 w-full delay-150 duration-500">
				<div class="mb-2 flex items-center justify-between px-1">
					<div class="flex items-center gap-4">
						<select
							class="cursor-pointer rounded border-none bg-sub/10 px-2 py-1 text-xs font-bold text-sub outline-none transition-colors hover:text-text"
						>
							<option>last 12 months</option>
						</select>
						<span class="text-xs text-sub opacity-50">{stats.started} tests</span>
					</div>
					<div class="flex items-center gap-1 text-[10px] text-sub">
						<span>less</span>
						<div class="h-2 w-2 rounded-sm bg-sub/10"></div>
						<div class="h-2 w-2 rounded-sm bg-main/20"></div>
						<div class="h-2 w-2 rounded-sm bg-main/50"></div>
						<div class="h-2 w-2 rounded-sm bg-main"></div>
						<span>more</span>
					</div>
				</div>

				<div
					class="relative flex w-full flex-col gap-2 overflow-hidden rounded-lg border border-sub/10 bg-sub/5 p-6"
				>
					<div
						class="absolute left-2 top-6 flex h-[80px] flex-col justify-between text-[10px] font-bold text-sub opacity-50"
					>
						<span>mon</span>
						<span>wed</span>
						<span>fri</span>
					</div>

					<div class="scrollbar-hide ml-8 flex gap-[3px] overflow-x-auto pb-2">
						{#each Array(53) as _, w}
							<div class="flex flex-col gap-[3px]">
								{#each Array(7) as _, d}
									{@const index = w * 7 + d}
									{@const dayData = heatmapData[index]}
									{#if dayData}
										<div
											class="group relative z-10 h-3 w-3 rounded-[2px] transition-all hover:scale-110 hover:ring-1 hover:ring-text"
											class:bg-sub-10={dayData.intensity === 0}
											class:bg-main-20={dayData.intensity === 1}
											class:bg-main-50={dayData.intensity === 2}
											class:bg-main-80={dayData.intensity === 3}
											class:bg-main={dayData.intensity === 4}
											style="background-color: {dayData.intensity === 0
												? 'rgba(var(--sub) / 0.1)'
												: `rgba(var(--main) / ${dayData.intensity * 0.25})`}"
										>
											<div
												class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max -translate-x-1/2 rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
											>
												{dayData.count} tests on {dayData.date}
											</div>
										</div>
									{/if}
								{/each}
							</div>
						{/each}
					</div>
				</div>
			</div>

			<div class="animate-in fade-in w-full delay-200 duration-500">
				<div class="mb-4 flex items-end justify-between">
					<h3 class="flex items-center gap-2 text-xs font-bold uppercase text-sub opacity-70">
						<Clock size={14} /> Sweep History
					</h3>
					<button
						class="flex items-center gap-1 rounded bg-sub/10 px-2 py-1 text-xs font-bold text-sub transition-colors hover:bg-sub/20 hover:text-text"
					>
						<Download size={12} /> Export CSV
					</button>
				</div>
				<div class="w-full overflow-hidden rounded-lg border border-sub/10 bg-sub/5">
					<table class="w-full border-collapse text-left text-sm">
						<thead class="bg-sub/10 text-[10px] font-bold uppercase tracking-wider text-sub">
							<tr>
								<th class="p-4">Mode</th>
								<th class="p-4">Info</th>
								<th class="p-4">Result</th>
								<th class="p-4">Score</th>
								<th class="p-4">Accuracy</th>
								<th class="p-4 text-right">Date</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-sub/5 text-xs">
							{#each history.slice(0, 10) as row}
								<tr class="transition-colors hover:bg-sub/5">
									<td class="flex items-center gap-2 p-4 font-bold text-text">
										<Activity size={12} class="text-sub opacity-50" />
										{row.mode}
									</td>
									<td class="p-4 font-medium text-sub">{row.setting}</td>
									<td class="p-4">
										{#if row.win}
											<span class="font-bold text-main">Win</span>
										{:else}
											<span class="text-sub opacity-50">Fail</span>
										{/if}
									</td>
									<td class="p-4 font-mono text-sm text-text">
										{#if row.mode === 'time'}
											{row.grids || 0}
											<span class="ml-1 text-[10px] font-bold text-sub opacity-50">grids</span>
										{:else}
											{row.time || 0}
											<span class="ml-1 text-[10px] font-bold text-sub opacity-50">s</span>
										{/if}
									</td>
									<td class="p-4 font-mono text-text">{row.accuracy}%</td>
									<td class="p-4 text-right font-medium text-sub opacity-70"
										>{new Date(row.created_at).toLocaleString()}</td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if history.length > 10}
					<button
						class="mt-2 w-full rounded bg-sub/5 py-3 text-xs font-bold uppercase tracking-widest text-sub transition-colors hover:bg-sub/10"
					>
						Load More
					</button>
				{/if}
			</div>
		</div>
	{/if}

	<div
		class="fixed bottom-8 flex w-full justify-between px-8 font-mono text-xs text-sub opacity-40"
	>
		<div class="flex gap-6">
			<div class="flex items-center gap-2">
				<kbd class="rounded bg-sub/20 px-1.5 py-0.5 text-text">tab</kbd><span>- restart</span>
			</div>
			<div class="flex items-center gap-2">
				<kbd
					class="       
        rounded bg-sub/20 px-1.5 py-0.5 text-text">esc</kbd
				><span>- search</span>
			</div>
		</div>
		<div class="flex gap-6">
			<button
				class="flex items-center gap-2 transition-colors hover:text-text"
				on:click={() => {
					showPalette = true;
					paletteView = 'root';
					setTimeout(() => searchInputEl?.focus(), 50);
				}}
			>
				<Trophy size={12} /><span>{$currentTheme.label}</span>
			</button>
			<div class="flex cursor-default select-none items-center gap-2"><span>v1.0.0</span></div>
		</div>
	</div>

	{#if showPalette}
		<div
			class="animate-in fade-in fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm duration-150"
			on:mousedown|self={() => (showPalette = false)}
		>
			<div
				class="mt-[15vh] flex max-h-[50vh] w-[450px] flex-col overflow-hidden rounded-lg border border-sub/20 bg-bg font-mono text-text shadow-2xl"
			>
				<div class="flex items-center gap-3 border-b border-sub/10 p-3">
					<Search size={14} class="text-main" />
					<input
						bind:this={searchInputEl}
						bind:value={searchQuery}
						type="text"
						placeholder={paletteView === 'root' ? 'Type to search...' : 'Search themes...'}
						class="h-full w-full border-none bg-transparent text-xs text-text outline-none placeholder:text-sub/50"
						on:keydown={(e) => {
							if (e.key === 'Backspace' && searchQuery === '' && paletteView === 'themes')
								paletteView = 'root';
						}}
					/>
				</div>
				<div class="overflow-y-auto p-1.5">
					{#if paletteView === 'root'}
						{#each filteredCommands as cmd}
							<button
								class="group flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-sub/10"
								on:click={cmd.action}
							>
								<div class="flex items-center gap-3">
									<svelte:component
										this={cmd.icon}
										size={12}
										class="text-sub transition-colors group-hover:text-main"
									/>
									<span class="text-sub/80 transition-colors group-hover:text-text"
										>{cmd.label}</span
									>
								</div>
								<ChevronRight
									size={12}
									class="text-sub/40 transition-colors group-hover:text-main"
								/>
							</button>
						{/each}
					{:else if paletteView === 'themes'}
						{#each filteredThemes as theme}
							<button
								class="group flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors hover:bg-sub/10 {$currentTheme.name ===
								theme.name
									? 'bg-main/5'
									: ''}"
								on:click={() => {
									$currentTheme = theme;
									showPalette = false;
								}}
							>
								<div class="flex items-center gap-3">
									<div class="flex gap-1">
										<div
											class="h-2 w-2 rounded-full border border-white/10"
											style="background-color: rgb({theme.colors.bg})"
										></div>
										<div
											class="h-2 w-2 rounded-full border border-white/10"
											style="background-color: rgb({theme.colors.main})"
										></div>
									</div>
									<span
										class="text-sub/80 transition-colors group-hover:text-text {$currentTheme.name ===
										theme.name
											? 'font-bold text-main'
											: ''}">{theme.label}</span
									>
								</div>
							</button>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
