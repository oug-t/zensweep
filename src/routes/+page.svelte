<script lang="ts">
	import {
		createGrid,
		placeMines,
		revealCell,
		DIRECTIONS,
		type Cell,
		calculate3BV
	} from '$lib/minesweeper';
	import { onMount, onDestroy } from 'svelte';
	// 1. Import confetti
	import confetti from 'canvas-confetti';
	import {
		Flag,
		Bomb,
		Grid3x3,
		Wrench,
		Flame,
		Flower2,
		User,
		LogOut,
		Clock,
		Hourglass,
		Infinity as InfinityIcon,
		Palette,
		Search,
		ChevronRight
	} from 'lucide-svelte';
	import ResultView from '$lib/ResultView.svelte';
	import { supabase } from '$lib/supabase';
	import { THEMES } from '$lib/themes';
	import { currentTheme } from '$lib/themeStore';
	import { base } from '$app/paths';

	const GRID_SIZES = [
		{ label: '9x9', rows: 9, cols: 9, mines: 10 },
		{ label: '16x16', rows: 16, cols: 16, mines: 40 },
		{ label: '30x16', rows: 16, cols: 30, mines: 99 }
	];

	const TIME_OPTIONS = [15, 30, 60, 120];

	// --- SETTINGS ---
	let gameMode: 'time' | 'standard' = 'time';
	let currentSize = GRID_SIZES[0];
	let timeLimit = 15;
	let customTime = 60;
	let isCustomTime = false;

	// --- COMMAND PALETTE STATE ---
	let showPalette = false;
	let paletteView: 'root' | 'themes' = 'root';
	let searchQuery = '';
	let searchInputEl: HTMLInputElement;

	// --- GAME STATE ---
	let grid: Cell[][] = [];
	let gameState: 'pending' | 'playing' | 'finished' = 'pending';
	let isFirstClick = true;
	let timer = 0;
	let timerInterval: ReturnType<typeof setInterval> | undefined;

	// --- STATS ---
	let minesLeft = 0;
	let totalClicks = 0;
	let clickHistory: number[] = [];
	let clicksThisSecond = 0;

	// New 3BV Variables
	let session3BV = 0;
	let currentGrid3BV = 0;
	// Track Win/Loss State for UI
	let isWin = false;

	let gridsSolved = 0;
	let gridsPlayed = 0;
	let totalCellsRevealed = 0;
	let sessionTotalMines = 0;
	let sessionErrors = 0;
	let finalAccuracy = 0;

	let isMouseDown = false;
	let hoveredCell: { r: number; c: number } | null = null;
	let currentUser: string | null = null;

	$: StatusIcon = (() => {
		if (gameState === 'finished') return Flower2;
		if (isMouseDown && gameState !== 'pending') return Flame;
		return Bomb;
	})();

	// --- FILTERING LOGIC ---
	$: filteredThemes = THEMES.filter((t) =>
		t.label.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const COMMANDS = [
		{
			id: 'theme',
			label: 'Theme...',
			icon: Palette,
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

	// --- ACTIONS ---
	function openPalette() {
		showPalette = true;
		paletteView = 'root';
		searchQuery = '';
		setTimeout(() => searchInputEl?.focus(), 50);
	}

	function setMode(mode: 'time' | 'standard') {
		gameMode = mode;
		fullReset();
	}
	function setSize(size: (typeof GRID_SIZES)[0]) {
		currentSize = size;
		fullReset();
	}
	function setTime(t: number) {
		timeLimit = t;
		isCustomTime = false;
		fullReset();
	}
	function setCustomTime() {
		isCustomTime = true;
		timeLimit = customTime;
		fullReset();
	}

	function countCurrentSafeOpen() {
		let count = 0;
		for (let row of grid) {
			for (let cell of row) {
				if (cell.isOpen && !cell.isMine) count++;
			}
		}
		return count;
	}

	function countWrongFlags() {
		let wrong = 0;
		for (let row of grid) {
			for (let cell of row) {
				if (cell.isFlagged && !cell.isMine) wrong++;
			}
		}
		return wrong;
	}

	function calculateAccuracy() {
		if (sessionTotalMines === 0) return 0;
		const rawAcc = ((sessionTotalMines - sessionErrors) / sessionTotalMines) * 100;
		return Math.max(0, Math.round(rawAcc));
	}

	// 2. Explosion Logic
	function triggerExplosion() {
		const colors = ['#ef4444', '#dc2626', '#b91c1c', '#000000']; // Red, Dark Red, Black

		confetti({
			particleCount: 150,
			spread: 100,
			origin: { y: 0.6 },
			colors: colors,
			disableForReducedMotion: true,
			gravity: 1.2,
			scalar: 1.2,
			drift: 0,
			ticks: 200
		});
	}

	function fullReset() {
		gameState = 'pending';
		gridsSolved = 0;
		gridsPlayed = 0;
		totalCellsRevealed = 0;
		totalClicks = 0;
		sessionTotalMines = 0;
		sessionErrors = 0;
		finalAccuracy = 0;
		isWin = false;

		// Reset 3BV
		session3BV = 0;

		clickHistory = [];
		clicksThisSecond = 0;
		timer = gameMode === 'time' ? timeLimit : 0;
		clearInterval(timerInterval);
		resetBoard();
	}

	function resetBoard() {
		isFirstClick = true;
		grid = createGrid(currentSize.rows, currentSize.cols);
		minesLeft = currentSize.mines;
	}

	function startSession() {
		if (gameState === 'playing') return;
		gameState = 'playing';

		timerInterval = setInterval(() => {
			if (gameMode === 'time') {
				timer--;
			} else {
				timer++;
			}
			clickHistory.push(clicksThisSecond);
			clickHistory = clickHistory;
			clicksThisSecond = 0;

			if (gameMode === 'time' && timer <= 0) {
				// Time ran out - Run Completed Successfully
				finishSession(true);
			}
		}, 1000);
	}

	// 3. Update finishSession to accept win/loss state
	function finishSession(win: boolean) {
		gameState = 'finished';
		isWin = win;
		clearInterval(timerInterval);

		if (clicksThisSecond > 0) clickHistory.push(clicksThisSecond);
		gridsPlayed++;

		// Only add credit for the current board if we won (or time ran out safely)
		// If we exploded, we don't count the revealed cells of the failed board
		if (win) {
			totalCellsRevealed += countCurrentSafeOpen();
		}

		sessionTotalMines += currentSize.mines;
		sessionErrors += countWrongFlags();
		finalAccuracy = calculateAccuracy();
		grid = [...grid];
		saveResult(win);
	}

	function handleClick(r: number, c: number) {
		if (gameState === 'finished') return;
		if (grid[r][c].isFlagged) return;

		totalClicks++;
		clicksThisSecond++;

		if (isFirstClick) {
			isFirstClick = false;
			if (gameState === 'pending') startSession();
			placeMines(grid, currentSize.mines, { r, c });

			currentGrid3BV = calculate3BV(grid);

			if (gameMode === 'standard') {
				session3BV = currentGrid3BV;
			}

			grid = [...grid];
		}

		const result = revealCell(grid, r, c);
		grid = result.grid;

		// 4. Update Game Over Logic for both modes
		if (result.gameOver) {
			// Trigger Explosion
			triggerExplosion();

			// Add error count
			sessionErrors += 1;
			sessionErrors += countWrongFlags();
			finalAccuracy = calculateAccuracy();

			// End Session immediately as LOSS (False)
			finishSession(false);
		} else {
			checkWin();
		}
	}

	function toggleFlag(r: number, c: number) {
		if (gameState === 'finished') return;
		if (!grid[r][c].isOpen) {
			grid[r][c].isFlagged = !grid[r][c].isFlagged;
			if (grid[r][c].isFlagged) minesLeft--;
			else minesLeft++;
			totalClicks++;
			clicksThisSecond++;
			grid = grid;
		}
	}

	function checkWin() {
		let safeCellsOpen = 0;
		const totalSafeCells = currentSize.rows * currentSize.cols - currentSize.mines;
		for (let row of grid) {
			for (let cell of row) {
				if (cell.isOpen && !cell.isMine) safeCellsOpen++;
			}
		}
		if (safeCellsOpen === totalSafeCells) {
			if (gameMode === 'time') {
				// Time Mode: Clear board, add points, go to next board
				gridsSolved++;
				session3BV += currentGrid3BV;
				totalCellsRevealed += totalSafeCells;
				handleGridEnd(true); // Continue playing
			} else {
				// Standard Mode: You win!
				gridsSolved = 1;
				gridsPlayed = 1;
				totalCellsRevealed += totalSafeCells;
				sessionTotalMines += currentSize.mines;
				finalAccuracy = 100;
				if (clicksThisSecond > 0) clickHistory.push(clicksThisSecond);
				finishSession(true); // Pass TRUE for win
			}
		}
	}

	function handleGridEnd(win: boolean) {
		gridsPlayed++;
		sessionTotalMines += currentSize.mines;
		if (!win) sessionErrors += 1;
		sessionErrors += countWrongFlags();

		// Note: This function is primarily used for Time Mode cycling now,
		// since Standard mode calls finishSession directly on win/loss.
		resetBoard();

		// Recalculate 3BV for the new board (Time Mode)
		// We can't do it here because mines aren't placed yet.
		// It happens on the next 'handleClick'
	}

	function handleInput(e: KeyboardEvent) {
		if (showPalette) {
			if (e.key === 'Escape') {
				if (paletteView === 'themes') {
					paletteView = 'root';
					searchQuery = '';
				} else {
					showPalette = false;
				}
			}
			return;
		}

		if (e.key === 'Tab') {
			const active = document.activeElement;
			if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
			e.preventDefault();
			fullReset();
			return;
		}

		if (e.key === 'Escape') {
			e.preventDefault();
			if (gameState === 'playing') {
				// Manually ending the session (Esc) counts as a safe finish
				finishSession(true);
			} else {
				openPalette();
			}
			return;
		}

		if (e.code === 'Space') {
			e.preventDefault();
			if (hoveredCell) {
				const { r, c } = hoveredCell;
				const cell = grid[r][c];
				if (!cell.isOpen) toggleFlag(r, c);
				else if (cell.neighborCount > 0) attemptChord(r, c);
			}
		}
	}

	function attemptChord(r: number, c: number) {
		const cell = grid[r][c];
		let flagCount = 0;
		DIRECTIONS.forEach(([dr, dc]) => {
			const nr = r + dr,
				nc = c + dc;
			if (grid[nr] && grid[nr][nc] && grid[nr][nc].isFlagged) flagCount++;
		});

		if (flagCount === cell.neighborCount) {
			totalClicks++;
			clicksThisSecond++;
			DIRECTIONS.forEach(([dr, dc]) => {
				const nr = r + dr,
					nc = c + dc;
				const neighbor = grid[nr]?.[nc];

				if (neighbor && !neighbor.isOpen && !neighbor.isFlagged) {
					handleClick(nr, nc);
				}
			});
		}
	}

	onMount(async () => {
		const {
			data: { session }
		} = await supabase.auth.getSession();
		if (session?.user) {
			currentUser = session.user.user_metadata.full_name || session.user.email?.split('@')[0];
		}
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, session) => {
			if (session?.user) {
				currentUser = session.user.user_metadata.full_name || session.user.email?.split('@')[0];
			} else {
				currentUser = null;
			}
		});
		fullReset();
		return () => {
			subscription.unsubscribe();
		};
	});

	async function handleLogout() {
		await supabase.auth.signOut();
		currentUser = null;
		fullReset();
	}

	async function saveResult(win: boolean) {
		const {
			data: { user }
		} = await supabase.auth.getUser();
		if (!user) return;

		const scoreValue = gameMode === 'time' ? gridsSolved : timer;
		const settingLabel = gameMode === 'time' ? timeLimit.toString() : currentSize.label;

		await supabase.from('game_results').insert({
			user_id: user.id,
			mode: gameMode,
			setting: settingLabel,
			win: win,
			score: scoreValue,
			accuracy: finalAccuracy
		});
	}

	onDestroy(() => clearInterval(timerInterval));
</script>

<svelte:window on:keydown={handleInput} on:mouseup={() => (isMouseDown = false)} />

<div
	class="relative flex min-h-screen flex-col items-center bg-bg font-mono text-text transition-colors duration-300"
>
	<div
		class="animate-in fade-in slide-in-from-top-4 mb-0 flex w-full max-w-5xl items-center justify-between p-8 duration-500"
	>
		<div class="flex items-center gap-4 transition-all duration-300">
			<a
				href="{base}/about"
				class="flex select-none items-center gap-2 transition-all
				{gameState === 'playing' ? 'pointer-events-none opacity-50 grayscale' : 'hover:opacity-80'}"
			>
				<Bomb size={24} class={gameState === 'playing' ? 'text-sub' : 'text-main'} />
				<h1 class="text-2xl font-bold tracking-tight text-text">
					z<span class={gameState === 'playing' ? 'text-text' : 'text-main'}>sweep</span>
				</h1>
			</a>

			<a
				href="{base}/about"
				class="text-sub transition-all duration-300 hover:text-text
				{gameState === 'playing' ? 'pointer-events-none opacity-0' : 'opacity-100'}"
				title="About"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg
				>
			</a>
		</div>

		<div
			class="flex items-center gap-6 text-sm transition-opacity duration-300
			{gameState === 'playing' ? 'pointer-events-none opacity-0' : 'opacity-100'}"
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
								<User size={14} />
								<span>Profile</span>
							</a>

							<button
								class="flex w-full cursor-not-allowed items-center gap-2 rounded px-3 py-2 text-left text-sub opacity-50 transition-colors hover:bg-sub/10 hover:text-text"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle
										cx="9"
										cy="7"
										r="4"
									/><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path
										d="M16 3.13a4 4 0 0 1 0 7.75"
									/></svg
								>
								<span>Friends</span>
							</button>

							<div class="my-1 h-[1px] bg-sub/10"></div>

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
			{:else}
				<a
					href="/login"
					class="flex h-8 w-8 items-center justify-center rounded text-sub transition-colors hover:bg-sub/10 hover:text-text"
					><User size={18} /></a
				>
			{/if}
		</div>
	</div>

	{#if gameState === 'finished'}
		<ResultView
			win={isWin}
			time={gameMode === 'time' ? timeLimit - timer : timer}
			cells={totalCellsRevealed}
			{totalClicks}
			history={clickHistory}
			accuracy={finalAccuracy}
			sizeLabel={currentSize.label}
			{gridsSolved}
			{gridsPlayed}
			mode={gameMode}
			total3BV={session3BV}
			on:restart={fullReset}
		/>
	{:else}
		<div
			class="mb-8 flex select-none items-center gap-6 rounded-lg bg-sub/10 px-4 py-2 text-xs transition-all duration-300 hover:bg-sub/15 {gameState ===
			'playing'
				? 'pointer-events-none opacity-0'
				: 'opacity-100'}"
		>
			<div class="flex items-center gap-3">
				<button
					class="flex items-center gap-2 transition-colors {gameMode === 'time'
						? 'font-bold text-main'
						: 'text-sub hover:text-text'}"
					on:click={() => setMode('time')}
				>
					<Hourglass size={12} /><span>time</span>
				</button>
				<button
					class="flex items-center gap-2 transition-colors {gameMode === 'standard'
						? 'font-bold text-main'
						: 'text-sub hover:text-text'}"
					on:click={() => setMode('standard')}
				>
					<InfinityIcon size={12} /><span>standard</span>
				</button>
			</div>
			<div class="h-3 w-[1px] bg-sub/20"></div>
			{#if gameMode === 'time'}
				<div class="flex items-center gap-3">
					<Clock size={12} class="text-sub opacity-50" />
					{#each TIME_OPTIONS as t}
						<button
							class="transition-colors duration-200 {timeLimit === t && !isCustomTime
								? 'font-bold text-main'
								: 'text-sub hover:text-text'}"
							on:click={() => setTime(t)}>{t}</button
						>
					{/each}
					<button
						class="transition-colors duration-200 {isCustomTime
							? 'text-main'
							: 'text-sub hover:text-text'}"
						on:click={setCustomTime}><Wrench size={12} /></button
					>
				</div>
				<div class="h-3 w-[1px] bg-sub/20"></div>
			{/if}
			<div class="flex items-center gap-3">
				<Grid3x3 size={12} class="text-sub opacity-50" />
				{#each GRID_SIZES as size}
					<button
						class="transition-colors duration-200 {currentSize.label === size.label
							? 'font-bold text-main'
							: 'text-sub hover:text-text'}"
						on:click={() => setSize(size)}>{size.label}</button
					>
				{/each}
				<button
					class="text-sub transition-colors duration-200 hover:text-text"
					on:click={openPalette}><Wrench size={12} /></button
				>
			</div>
		</div>

		<div class="animate-in fade-in flex flex-col gap-2 duration-300">
			<div class="mb-2 flex select-none items-end justify-between px-1 text-main">
				<div class="flex w-12 flex-col">
					<span class="text-[10px] font-bold uppercase text-sub opacity-50">time</span>
					<span class="text-3xl font-bold leading-none text-main">{timer}</span>
				</div>
				{#if gameMode === 'time'}
					<div class="flex flex-col items-center opacity-50">
						<span class="text-[10px] font-bold uppercase">solved</span>
						<span class="text-xl font-bold">{gridsSolved}/{gridsPlayed}</span>
					</div>
				{/if}
				<div class="flex w-12 flex-col text-right">
					<span class="text-[10px] font-bold uppercase text-sub opacity-50">mines</span>
					<span class="text-3xl font-bold leading-none">{minesLeft}</span>
				</div>
			</div>

			<div
				class="grid select-none gap-1 bg-bg transition-all duration-300 ease-in-out"
				style="grid-template-columns: repeat({currentSize.cols}, minmax(0, 1fr));"
				on:mousedown={() => {
					if (gameState === 'playing') isMouseDown = true;
				}}
			>
				{#each grid as row, r (r)}
					{#each row as cell, c (c)}
						<button
							class="flex h-8 w-8 items-center justify-center rounded-sm text-sm font-bold transition-all duration-75 focus:outline-none
							{cell.isOpen ? 'bg-sub/10' : 'bg-sub/30 hover:bg-sub/50'}
							{cell.isMine && cell.isOpen ? 'bg-error text-bg' : ''}
							{cell.isMine && !cell.isOpen && gameState === 'finished' ? 'bg-error/50 opacity-50' : ''}
							{hoveredCell?.r === cell.row && hoveredCell?.c === cell.col
								? 'z-10 ring-2 ring-main/20 brightness-125'
								: ''}"
							on:click={() => handleClick(cell.row, cell.col)}
							on:contextmenu|preventDefault={() => toggleFlag(cell.row, cell.col)}
							on:mouseenter={() => (hoveredCell = { r: cell.row, c: cell.col })}
							on:mouseleave={() => (hoveredCell = null)}
						>
							{#if cell.isOpen}
								{#if cell.isMine}
									<Bomb size={16} />
								{:else if cell.neighborCount > 0}
									<span
										class={cell.neighborCount === 1
											? 'text-blue-400'
											: cell.neighborCount === 2
												? 'text-green-400'
												: cell.neighborCount === 3
													? 'text-red-400'
													: 'text-purple-400'}>{cell.neighborCount}</span
									>
								{/if}
							{:else if cell.isFlagged}
								<span class="text-error"><Flag size={14} fill="currentColor" /></span>
							{/if}
						</button>
					{/each}
				{/each}
			</div>
		</div>
	{/if}

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
							if (e.key === 'Backspace' && searchQuery === '' && paletteView === 'themes') {
								paletteView = 'root';
							}
						}}
					/>
					{#if paletteView === 'themes'}
						<span
							class="rounded bg-sub/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-sub"
							>Themes</span
						>
					{/if}
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
						{#if filteredCommands.length === 0}
							<div class="p-3 text-center text-[10px] italic text-sub opacity-50">
								No commands found...
							</div>
						{/if}
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
										<div
											class="h-2 w-2 rounded-full border border-white/10"
											style="background-color: rgb({theme.colors.error})"
										></div>
									</div>
									<span
										class="text-sub/80 transition-colors group-hover:text-text {$currentTheme.name ===
										theme.name
											? 'font-bold text-main'
											: ''}"
									>
										{theme.label}
									</span>
								</div>
								{#if $currentTheme.name === theme.name}
									<span class="rounded bg-main/20 px-1.5 py-0 text-[9px] text-main">Active</span>
								{/if}
							</button>
						{/each}
						{#if filteredThemes.length === 0}
							<div class="p-3 text-center text-[10px] italic text-sub opacity-50">
								No themes found...
							</div>
						{/if}
					{/if}
				</div>

				<div
					class="flex select-none justify-between border-t border-sub/10 bg-sub/5 p-1.5 px-3 text-[10px] text-sub"
				>
					<span>navigate with arrows</span>
					<div class="flex gap-3">
						<span><kbd class="rounded bg-sub/20 px-1">esc</kbd> close</span>
						<span><kbd class="rounded bg-sub/20 px-1">↵</kbd> select</span>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<div
		class="fixed bottom-8 flex w-full justify-between px-8 font-mono text-xs text-sub opacity-40 transition-opacity duration-300 {gameState ===
		'playing'
			? 'opacity-0'
			: 'opacity-100'}"
	>
		<div class="flex gap-6">
			<div class="flex items-center gap-2">
				<kbd class="rounded bg-sub/20 px-1.5 py-0.5 text-text">tab</kbd>
				<span>- restart</span>
			</div>
			<div class="flex items-center gap-2">
				<kbd class="rounded bg-sub/20 px-1.5 py-0.5 text-text">esc</kbd>
				<span>- search</span>
			</div>
		</div>

		<div class="flex gap-6">
			<button
				class="flex items-center gap-2 transition-colors hover:text-text"
				on:click={openPalette}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle
						cx="8.5"
						cy="7.5"
						r=".5"
					/><circle cx="6.5" cy="12.5" r=".5" /><path
						d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"
					/></svg
				>
				<span>{$currentTheme.label}</span>
			</button>

			<div class="flex cursor-default select-none items-center gap-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><rect width="20" height="8" x="2" y="14" rx="2" /><path
						d="M6 14V6a2 2 0 0 1 2-2h2"
					/><path d="M18 9h2a2 2 0 0 1 2 2v11l-3-3" /><path d="M14 6a2 2 0 0 0-2-2" /></svg
				>
				<span>v1.0.0</span>
			</div>
		</div>
	</div>
</div>
