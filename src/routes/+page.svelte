<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import confetti from 'canvas-confetti';
	import {
		Grid3x3,
		Wrench,
		User,
		LogOut,
		Hourglass,
		Infinity as InfinityIcon,
		Palette,
		Info,
		Bomb
	} from 'lucide-svelte';
	import {
		createGrid,
		placeMines,
		revealCell,
		DIRECTIONS,
		type Cell,
		calculate3BV,
		revealCellsAround,
		countFlagsAround
	} from '$lib/minesweeper';

	import { supabase } from '$lib/supabase';
	import { currentTheme } from '$lib/themeStore';
	import { handleVimKey, calculateVimJump } from '$lib/game/input/vim';

	import GameGrid from '$lib/components/GameGrid.svelte';
	import ResultView from '$lib/components/ResultView.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import CustomSettingsModal from '$lib/components/CustomSettingsModal.svelte';

	import type { PageData } from './$types';
	export let data: PageData;

	const GAME_CONFIG = {
		gridSizes: [
			{ label: '9x9', rows: 9, cols: 9, mines: 10 },
			{ label: '16x16', rows: 16, cols: 16, mines: 40 },
			{ label: '30x16', rows: 16, cols: 30, mines: 99 }
		],
		timeLimits: [15, 30, 60]
	};

	let game = {
		mode: 'standard' as 'time' | 'standard',
		size: GAME_CONFIG.gridSizes[0],
		timeLimit: 15,
		state: 'pending' as 'pending' | 'playing' | 'finished',
		grid: [] as Cell[][],
		minesLeft: 0,
		timer: 0,
		timerInterval: undefined as ReturnType<typeof setInterval> | undefined,
		isFirstClick: true
	};

	let input = {
		cursor: { r: 0, c: 0 },
		buffer: '',
		lastKey: '',
		lastKeyTime: 0,
		isMouseDown: false
	};

	let search = {
		active: false,
		term: '',
		matches: [] as { r: number; c: number }[],
		matchIndex: -1
	};

	let ui = {
		showPalette: false,
		showCustomModal: false
	};

	let stats = {
		clicks: 0,
		clicksThisSecond: 0,
		history: [] as number[],
		session3BV: 0,
		currentGrid3BV: 0,
		isWin: false,
		gridsSolved: 0,
		gridsPlayed: 0,
		cellsRevealed: 0,
		sessionTotalMines: 0,
		sessionErrors: 0,
		finalAccuracy: 0
	};

	let currentUser: string | null = null;

	function openPalette() {
		ui.showPalette = true;
	}

	function openCustomModal() {
		ui.showCustomModal = true;
	}

	function applyCustomSettings(event: CustomEvent) {
		const config = event.detail;

		if (game.mode === 'standard') {
			const r = Math.max(5, Math.min(50, config.rows));
			const c = Math.max(5, Math.min(50, config.cols));
			// Max mines is 85% of grid
			const maxMines = Math.floor(r * c * 0.85);
			const m = Math.max(1, Math.min(maxMines, config.mines));

			game.size = { label: 'Custom', rows: r, cols: c, mines: m };
		} else {
			const t = Math.max(10, Math.min(999, config.time));
			setTime(t);
		}
		ui.showCustomModal = false;
		fullReset();
	}

	function setMode(mode: 'time' | 'standard') {
		game.mode = mode;
		if (game.mode === 'time' && game.size.label !== '9x9') {
			game.size = GAME_CONFIG.gridSizes[0];
		}
		fullReset();
	}

	function setTime(seconds: number) {
		game.timeLimit = seconds;
		fullReset();
	}

	function setSize(size: (typeof GAME_CONFIG.gridSizes)[0]) {
		game.size = size;
		if (game.size.label !== '9x9' && game.mode === 'time') {
			game.mode = 'standard';
		}
		fullReset();
	}

	function fullReset() {
		game.state = 'pending';
		stats.gridsSolved = 0;
		stats.gridsPlayed = 0;
		stats.cellsRevealed = 0;
		stats.clicks = 0;
		stats.sessionTotalMines = 0;
		stats.sessionErrors = 0;
		stats.finalAccuracy = 0;
		stats.isWin = false;
		stats.session3BV = 0;
		stats.history = [];
		stats.clicksThisSecond = 0;

		game.timer = game.mode === 'time' ? game.timeLimit : 0;
		if (game.timerInterval) clearInterval(game.timerInterval);

		resetBoard();
	}

	function resetBoard() {
		game.isFirstClick = true;
		game.grid = createGrid(game.size.rows, game.size.cols);
		game.minesLeft = game.size.mines;
		input.cursor = {
			r: Math.floor(game.size.rows / 2),
			c: Math.floor(game.size.cols / 2)
		};
	}

	function startSession() {
		if (game.state === 'playing') return;
		game.state = 'playing';
		game.timerInterval = setInterval(() => {
			if (game.mode === 'time') game.timer--;
			else game.timer++;

			stats.history = [...stats.history, stats.clicksThisSecond];
			stats.clicksThisSecond = 0;

			if (game.mode === 'time' && game.timer <= 0) finishSession(true);
		}, 1000);
	}

	function finishSession(win: boolean) {
		game.state = 'finished';
		stats.isWin = win;
		if (game.timerInterval) clearInterval(game.timerInterval);
		if (stats.clicksThisSecond > 0) {
			stats.history = [...stats.history, stats.clicksThisSecond];
		}

		if (game.mode === 'standard') {
			stats.gridsPlayed = 1;
			stats.sessionTotalMines = game.size.mines;
			stats.cellsRevealed = win
				? game.size.rows * game.size.cols - game.size.mines
				: countCurrentSafeOpen();
		} else {
			if (win) {
				stats.cellsRevealed += countCurrentSafeOpen();
				stats.sessionTotalMines += game.size.mines;
				stats.gridsPlayed++;
			}
		}

		if (!win) stats.sessionErrors += countWrongFlags();
		stats.finalAccuracy = calculateAccuracy();
		game.grid = [...game.grid];
		if (win) triggerWin();
		saveResult(win);
	}

	function handleClick(r: number, c: number) {
		if (game.state === 'finished' || game.grid[r][c].isFlagged) return;
		stats.clicks++;
		stats.clicksThisSecond++;

		if (game.isFirstClick) {
			game.isFirstClick = false;
			if (game.state === 'pending') startSession();
			placeMines(game.grid, game.size.mines, { r, c });
			stats.currentGrid3BV = calculate3BV(game.grid);
			if (game.mode === 'standard') stats.session3BV = stats.currentGrid3BV;
		}

		const canChord =
			game.grid[r][c].isOpen && countFlagsAround(game.grid, r, c) === game.grid[r][c].neighborCount;

		const result = canChord ? revealCellsAround(game.grid, r, c) : revealCell(game.grid, r, c);

		game.grid = result.grid;
		if (result.gameOver) {
			triggerExplosion();
			stats.sessionErrors += 1 + countWrongFlags();
			finishSession(false);
		} else {
			checkWin();
		}
	}

	function toggleFlag(r: number, c: number) {
		if (game.state === 'finished' || game.grid[r][c].isOpen) return;
		game.grid[r][c].isFlagged = !game.grid[r][c].isFlagged;
		game.minesLeft += game.grid[r][c].isFlagged ? -1 : 1;
		stats.clicks++;
		stats.clicksThisSecond++;
		game.grid = game.grid;
	}

	function attemptChord(r: number, c: number) {
		const cell = game.grid[r][c];
		let flagCount = 0;
		DIRECTIONS.forEach(([dr, dc]) => {
			if (game.grid[r + dr]?.[c + dc]?.isFlagged) flagCount++;
		});
		if (flagCount === cell.neighborCount) {
			stats.clicks++;
			stats.clicksThisSecond++;
			DIRECTIONS.forEach(([dr, dc]) => {
				const nr = r + dr,
					nc = c + dc;
				if (game.grid[nr]?.[nc] && !game.grid[nr][nc].isOpen && !game.grid[nr][nc].isFlagged) {
					handleClick(nr, nc);
				}
			});
		}
	}

	function handleInput(e: KeyboardEvent) {
		if (ui.showPalette || ui.showCustomModal) {
			if (e.key === 'Escape') {
				if (ui.showCustomModal) ui.showCustomModal = false;
			}
			return;
		}

		if (search.active) {
			e.preventDefault();
			if (e.key === 'Escape') {
				search.active = false;
				search.term = '';
			} else if (e.key === 'Enter') {
				executeSearch();
				search.active = false;
			} else if (e.key === 'Backspace') {
				search.term = search.term.slice(0, -1);
			} else if (/^[0-8]$/.test(e.key)) {
				search.term = e.key;
			}
			return;
		}

		const activeEl = document.activeElement;
		if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
		if (e.metaKey || e.ctrlKey || e.altKey) return;

		if (e.key === 'Tab') {
			e.preventDefault();
			fullReset();
			return;
		}
		if (e.key === 'Escape') {
			e.preventDefault();
			if (input.buffer.length > 0) input.buffer = '';
			else if (game.state === 'playing') finishSession(true);
			else openPalette();
			return;
		}

		const now = Date.now();
		if (e.key === 'g' && input.lastKey === 'g' && now - input.lastKeyTime < 500) {
			input.cursor = { r: 0, c: input.cursor.c };
			input.lastKey = '';
			input.buffer = '';
			return;
		}
		if (e.key === 'g') {
			input.lastKey = 'g';
			input.lastKeyTime = now;
			return;
		}

		const mult = input.buffer.length > 0 ? parseInt(input.buffer) : 1;

		const jumpDest = calculateVimJump(
			e.key,
			mult,
			input.cursor,
			game.grid,
			game.size.rows,
			game.size.cols
		);

		if (jumpDest) {
			input.cursor = jumpDest;
			input.buffer = '';
			return;
		}

		const action = handleVimKey(e.key);
		if (action) {
			e.preventDefault();

			if (action.type === 'START_SEARCH') {
				search.active = true;
				search.term = '';
				return;
			}

			if (action.type === 'NEXT_MATCH' && search.matches.length > 0) {
				search.matchIndex = (search.matchIndex + 1) % search.matches.length;
				input.cursor = search.matches[search.matchIndex];
				return;
			}
			if (action.type === 'PREV_MATCH' && search.matches.length > 0) {
				search.matchIndex = (search.matchIndex - 1 + search.matches.length) % search.matches.length;
				input.cursor = search.matches[search.matchIndex];
				return;
			}

			if (action.type === 'DIGIT') {
				input.buffer += action.value;
				return;
			}
			if (action.type === 'ZERO') {
				if (input.buffer.length > 0) input.buffer += '0';
				else input.cursor = { r: input.cursor.r, c: 0 };
				return;
			}

			if (action.type === 'START_ROW') {
				input.cursor = { r: input.cursor.r, c: 0 };
				input.buffer = '';
				return;
			}
			if (action.type === 'GO_TOP') {
				input.cursor = { r: 0, c: input.cursor.c };
				input.buffer = '';
				return;
			}
			if (action.type === 'GO_BOTTOM') {
				input.cursor = { r: game.size.rows - 1, c: input.cursor.c };
				input.buffer = '';
				return;
			}

			if (action.type === 'MOVE_CURSOR') {
				input.cursor.r = Math.max(
					0,
					Math.min(game.size.rows - 1, input.cursor.r + action.dy * mult)
				);
				input.cursor.c = Math.max(
					0,
					Math.min(game.size.cols - 1, input.cursor.c + action.dx * mult)
				);
				input.buffer = '';
			} else if (action.type === 'FLAG') {
				toggleFlag(input.cursor.r, input.cursor.c);
				input.buffer = '';
			} else if (action.type === 'REVEAL') {
				handleClick(input.cursor.r, input.cursor.c);
				input.buffer = '';
			} else if (action.type === 'SMART') {
				if (!game.grid[input.cursor.r][input.cursor.c].isOpen)
					toggleFlag(input.cursor.r, input.cursor.c);
				else attemptChord(input.cursor.r, input.cursor.c);
				input.buffer = '';
			}
		}
	}

	function executeSearch() {
		if (!search.term) return;
		const target = parseInt(search.term);
		search.matches = [];
		for (let r = 0; r < game.size.rows; r++) {
			for (let c = 0; c < game.size.cols; c++) {
				const cell = game.grid[r][c];
				if (target === 0 ? !cell.isOpen : cell.isOpen && cell.neighborCount === target) {
					search.matches.push({ r, c });
				}
			}
		}
		if (search.matches.length > 0) {
			search.matchIndex = search.matches.findIndex(
				(m) => m.r > input.cursor.r || (m.r === input.cursor.r && m.c >= input.cursor.c)
			);
			if (search.matchIndex === -1) search.matchIndex = 0;
			input.cursor = search.matches[search.matchIndex];
		}
	}

	function countCurrentSafeOpen() {
		let count = 0;
		game.grid.forEach((row) =>
			row.forEach((c) => {
				if (c.isOpen && !c.isMine) count++;
			})
		);
		return count;
	}

	function countWrongFlags() {
		let wrong = 0;
		game.grid.forEach((row) =>
			row.forEach((c) => {
				if (c.isFlagged && !c.isMine) wrong++;
			})
		);
		return wrong;
	}

	function calculateAccuracy() {
		if (stats.sessionTotalMines === 0) return 0;
		return Math.max(
			0,
			Math.round(((stats.sessionTotalMines - stats.sessionErrors) / stats.sessionTotalMines) * 100)
		);
	}

	function checkWin() {
		let safeOpen = countCurrentSafeOpen();
		const totalSafe = game.size.rows * game.size.cols - game.size.mines;
		if (safeOpen === totalSafe) {
			if (game.mode === 'time') {
				stats.gridsSolved++;
				stats.gridsPlayed++;
				stats.session3BV += stats.currentGrid3BV;
				stats.cellsRevealed += totalSafe;
				stats.sessionTotalMines += game.size.mines;
				stats.sessionErrors += countWrongFlags();
				resetBoard();
			} else {
				stats.gridsSolved = 1;
				finishSession(true);
			}
		}
	}

	function triggerExplosion() {
		confetti({
			particleCount: 150,
			spread: 100,
			origin: { y: 0.6 },
			colors: ['#ef4444', '#dc2626', '#b91c1c']
		});
	}

	function triggerWin() {
		confetti({
			particleCount: 200,
			spread: 120,
			origin: { y: 0.6 },
			colors: ['#10b981', '#34d399', '#f59e0b']
		});
	}

	async function saveResult(win: boolean) {
		const {
			data: { session }
		} = await supabase.auth.getSession();
		let timeTaken =
			game.mode === 'standard' ? game.timer : Math.max(0, game.timeLimit - game.timer);
		const { error } = await supabase.from('game_results').insert({
			user_id: session?.user?.id || null,
			mode: game.mode,
			setting: game.mode === 'time' ? game.timeLimit.toString() : game.size.label,
			win,
			time: timeTaken,
			grids: game.mode === 'standard' ? (win ? 1 : 0) : stats.gridsSolved,
			total_mines: win
				? game.mode === 'standard'
					? game.size.mines
					: stats.gridsSolved * game.size.mines
				: 0,
			accuracy: stats.finalAccuracy
		});
		if (error) console.error('Error saving result:', error);
	}

	export const load: PageServerLoad = async ({ locals: { supabase } }) => {
		const { data: totalSeconds, error } = await supabase.rpc('get_total_sweeping_time');

		if (error) {
			console.error('Error fetching global stats:', error);
		}

		return {
			stats: {
				seconds: totalSeconds || 0
			}
		};
	};

	onMount(async () => {
		const {
			data: { session }
		} = await supabase.auth.getSession();
		if (session?.user) {
			currentUser = session.user.user_metadata.full_name || session.user.email?.split('@')[0];
		}
		fullReset();
	});

	async function handleLogout() {
		await supabase.auth.signOut();
		currentUser = null;
		fullReset();
	}
</script>

<svelte:head>
	<title>Zsweep</title>
	<meta name="theme-color" content="#323437" />
	<meta
		name="description"
		content="Play Zsweep, a fast-paced, keyboard-centric Minesweeper game inspired by Monkeytype. Track stats, use Vim motions, and enjoy a distraction-free experience."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://zsweep.com/" />
	<meta property="og:title" content="Zsweep | Modern Minesweeper" />
	<meta
		property="og:description"
		content="A fast, keyboard-centric Minesweeper game inspired by Monkeytype."
	/>
	<meta property="og:image" content="https://zsweep.com/og-image.png" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Zsweep" />
	<meta name="twitter:description" content="Minimalist Minesweeper. No ads. Just speed." />
	<meta name="twitter:image" content="https://zsweep.com/og-image.png" />

	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "VideoGame",
			"name": "Zsweep",
			"url": "https://zsweep.com",
			"description": "A modern, minimalist minesweeper game inspired by Monkeytype.",
			"genre": "Puzzle",
			"playMode": "SinglePlayer",
			"applicationCategory": "Game",
			"operatingSystem": "Web Browser",
			"offers": {
				"@type": "Offer",
				"price": "0",
				"priceCurrency": "USD"
			}
		}
	</script>
</svelte:head>

<svelte:window on:keydown={handleInput} on:mouseup={() => (input.isMouseDown = false)} />

<div
	class="relative flex min-h-screen flex-col items-center bg-bg font-mono text-text transition-colors duration-300"
>
	<div
		class="animate-in fade-in slide-in-from-top-4 mb-0 flex w-full max-w-5xl items-center justify-between p-8 duration-500"
	>
		<div class="flex items-center gap-4 transition-all duration-300">
			<a
				href="{base}/"
				class="group flex select-none items-center gap-3 transition-all {game.state === 'playing'
					? 'pointer-events-none opacity-50 grayscale'
					: 'hover:opacity-80'}"
			>
				<Bomb
					size={28}
					strokeWidth={2.5}
					class="transition-transform duration-300 group-hover:scale-110 {game.state === 'playing'
						? 'text-sub'
						: 'text-main'}"
				/>
				<h1 class="font-mono text-3xl font-black leading-none tracking-tighter text-text">
					z<span class={game.state === 'playing' ? 'text-text' : 'text-main'}>sweep</span>
				</h1>
			</a>

			<a
				href="{base}/about"
				class="text-sub transition-all duration-300 hover:text-text {game.state === 'playing'
					? 'pointer-events-none opacity-0'
					: 'opacity-100'}"
				title="About"
			>
				<Info size={20} />
			</a>
		</div>

		<div
			class="flex items-center gap-6 text-sm transition-opacity duration-300 {game.state ===
			'playing'
				? 'pointer-events-none opacity-0'
				: 'opacity-100'}"
		>
			{#if currentUser}
				<div class="group relative z-20">
					<button
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
								href="{base}/profile"
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
	</div>

	{#if game.state === 'finished'}
		<ResultView
			win={stats.isWin}
			time={game.mode === 'time' ? game.timeLimit - game.timer : game.timer}
			cells={stats.cellsRevealed}
			totalClicks={stats.clicks}
			history={stats.history}
			accuracy={stats.finalAccuracy}
			sizeLabel={game.size.label}
			gridsSolved={stats.gridsSolved}
			gridsPlayed={stats.gridsPlayed}
			mode={game.mode}
			total3BV={stats.session3BV}
			totalGlobalSeconds={data?.stats?.seconds || 0}
			on:restart={fullReset}
		/>
	{:else}
		<div
			class="mb-8 flex select-none items-center gap-6 rounded-lg bg-sub/10 px-4 py-2 text-xs transition-all duration-300 {game.state ===
			'playing'
				? 'pointer-events-none opacity-0'
				: 'opacity-100'}"
		>
			<div class="flex items-center gap-3">
				<button
					class="flex items-center gap-2 transition-colors {game.mode === 'standard'
						? 'font-bold text-main'
						: 'text-sub hover:text-text'}"
					on:click={() => setMode('standard')}
				>
					<InfinityIcon size={12} /><span>standard</span>
				</button>
				<button
					class="flex items-center gap-2 transition-colors {game.mode === 'time'
						? 'font-bold text-main'
						: 'text-sub hover:text-text'}"
					on:click={() => setMode('time')}
				>
					<Hourglass size={12} /><span>time</span>
				</button>
			</div>

			<div class="h-3 w-[1px] bg-sub/20"></div>

			<div class="flex items-center gap-3">
				{#if game.mode === 'standard'}
					<Grid3x3 size={12} class="text-sub opacity-50" />
					{#each GAME_CONFIG.gridSizes as size}
						<button
							class={game.size.label === size.label
								? 'font-bold text-main'
								: 'text-sub hover:text-text'}
							on:click={() => setSize(size)}>{size.label}</button
						>
					{/each}
				{:else}
					<Hourglass size={12} class="text-sub opacity-50" />
					{#each GAME_CONFIG.timeLimits as t}
						<button
							class={game.timeLimit === t ? 'font-bold text-main' : 'text-sub hover:text-text'}
							on:click={() => setTime(t)}>{t}s</button
						>
					{/each}
				{/if}

				<div class="mx-1 h-3 w-[1px] bg-sub/20"></div>

				<button
					class="text-sub transition-colors hover:text-main"
					on:click={openCustomModal}
					title="Custom Settings"
				>
					<Wrench size={12} />
				</button>

				<button
					class="text-sub transition-colors hover:text-main"
					on:click={openPalette}
					title="Themes"
				>
					<Palette size={12} />
				</button>
			</div>
		</div>

		<div class="animate-in fade-in flex flex-col gap-2 duration-300">
			<div class="mb-2 flex select-none items-end justify-between px-1 text-main">
				<div class="flex w-12 flex-col">
					<span class="text-[10px] font-bold uppercase text-sub opacity-50">time</span>
					<span class="text-3xl font-bold leading-none text-main">{game.timer}</span>
				</div>
				<div class="flex w-12 flex-col text-right">
					<span class="text-[10px] font-bold uppercase text-sub opacity-50">mines</span>
					<span class="text-3xl font-bold leading-none">{game.minesLeft}</span>
				</div>
			</div>

			<GameGrid
				grid={game.grid}
				cursor={input.cursor}
				numCols={game.size.cols}
				gameState={game.state}
				on:click={(e) => handleClick(e.detail.r, e.detail.c)}
				on:flag={(e) => toggleFlag(e.detail.r, e.detail.c)}
				on:hover={(e) => (input.cursor = e.detail)}
				on:mousedown={() => {
					if (game.state === 'playing') input.isMouseDown = true;
				}}
			/>
		</div>
	{/if}

	<CommandPalette bind:show={ui.showPalette} />

	<CustomSettingsModal
		bind:show={ui.showCustomModal}
		gameMode={game.mode}
		currentRows={game.size.rows}
		currentCols={game.size.cols}
		currentMines={game.size.mines}
		currentTime={game.timeLimit}
		on:apply={applyCustomSettings}
	/>

	{#if search.active}
		<div
			class="animate-in fade-in slide-in-from-bottom-2 fixed bottom-20 left-1/2 z-50 -translate-x-1/2"
		>
			<div
				class="flex items-center gap-2 rounded-full border border-main/20 bg-bg px-4 py-2 shadow-2xl"
			>
				<span class="font-bold text-main">/</span>
				<span class="min-w-[10px] font-mono text-lg text-text">{search.term}</span>
				<span class="animate-pulse text-main">_</span>
			</div>
		</div>
	{/if}

	<div
		class="pointer-events-none fixed bottom-6 left-0 right-0 flex w-full select-none justify-between px-8"
	>
		<div
			class="flex flex-col gap-2 text-[10px] font-bold tracking-widest text-sub transition-opacity duration-500 {game.state ===
			'playing'
				? 'opacity-20'
				: 'opacity-60'}"
		>
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
					>esc</kbd
				>
				<span class="h-[1px] w-3 bg-sub/30"></span>
				<span>settings</span>
			</div>

			<div class="flex items-center gap-3">
				<kbd
					class="flex min-w-[36px] justify-center rounded bg-sub/20 px-1.5 py-0.5 font-mono text-text shadow-sm"
					>enter</kbd
				>
				<span class="h-[1px] w-3 bg-sub/30"></span>
				<span>reveal</span>
			</div>

			<div class="flex items-center gap-3">
				<kbd
					class="flex min-w-[36px] justify-center rounded bg-sub/20 px-1.5 py-0.5 font-mono text-text shadow-sm"
					>spc</kbd
				>
				<span class="h-[1px] w-3 bg-sub/30"></span>
				<span>flag / chord</span>
			</div>

			<div class="flex items-center gap-3">
				<kbd
					class="flex min-w-[36px] justify-center rounded bg-sub/20 px-1.5 py-0.5 font-mono text-text shadow-sm"
					>vim</kbd
				>
				<span class="h-[1px] w-3 bg-sub/30"></span>
				<span>motions</span>
			</div>
		</div>

		<div
			class="flex flex-col justify-end text-right text-[10px] font-bold uppercase tracking-widest text-sub transition-opacity duration-500 {game.state ===
			'playing'
				? 'opacity-20'
				: 'opacity-60'}"
		>
			<div class="flex items-center gap-2">
				<span>{$currentTheme.label}</span>
				<Palette size={10} />
			</div>
		</div>
	</div>
</div>
