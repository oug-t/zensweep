<script lang="ts">
	import {
		createGrid,
		placeMines,
		revealCell,
		DIRECTIONS,
		type Cell,
		calculate3BV
	} from '$lib/minesweeper';
	import { onMount } from 'svelte';
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
		Hourglass,
		Infinity as InfinityIcon,
		Palette,
		Search,
		ChevronRight,
		Info
	} from 'lucide-svelte';
	import ResultView from '$lib/components/ResultView.svelte';
	import { supabase } from '$lib/supabase';
	import { THEMES } from '$lib/themes';
	import { currentTheme } from '$lib/themeStore';
	import { base } from '$app/paths';
	import { handleVimKey } from '$lib/game/input/vim';

	// --- PROPS ---
	// Using export let instead of $props() to avoid the "runes mode" error
	export let data;

	// --- CONFIG ---
	const GRID_SIZES = [
		{ label: '9x9', rows: 9, cols: 9, mines: 10 },
		{ label: '16x16', rows: 16, cols: 16, mines: 40 },
		{ label: '30x16', rows: 16, cols: 30, mines: 99 }
	];

	// --- STATE ---
	let gameMode: 'time' | 'standard' = 'time';
	let currentSize = GRID_SIZES[0];
	let timeLimit = 15;
	let customTime = 60;
	let isCustomTime = false;

	let cursor = { r: 0, c: 0 };
	let vimBuffer = '';
	let lastKey = '';
	let lastKeyTime = 0;
	let isSearchMode = false;
	let searchTerm = '';
	let searchMatches: { r: number; c: number }[] = [];
	let matchIndex = -1;

	let showPalette = false;
	let paletteView: 'root' | 'themes' = 'root';
	let searchQuery = '';
	let searchInputEl: HTMLInputElement;

	let grid: Cell[][] = [];
	let gameState: 'pending' | 'playing' | 'finished' = 'pending';
	let isFirstClick = true;
	let timer = 0;
	let timerInterval: ReturnType<typeof setInterval> | undefined;

	let minesLeft = 0;
	let totalClicks = 0;
	let clickHistory: number[] = [];
	let clicksThisSecond = 0;

	// Stats
	let session3BV = 0;
	let currentGrid3BV = 0;
	let isWin = false;
	let gridsSolved = 0;
	let gridsPlayed = 0;
	let totalCellsRevealed = 0;
	let sessionTotalMines = 0;
	let sessionErrors = 0;
	let finalAccuracy = 0;

	let isMouseDown = false;
	let currentUser: string | null = null;

	// --- REACTIVE DECLARATIONS (Svelte 4 Style) ---
	$: StatusIcon = (() => {
		if (gameState === 'finished') return Flower2;
		if (isMouseDown && gameState !== 'pending') return Flame;
		return Bomb;
	})();

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

	// --- CORE FUNCTIONS ---
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
		session3BV = 0;
		clickHistory = [];
		clicksThisSecond = 0;
		timer = gameMode === 'time' ? timeLimit : 0;
		if (timerInterval) clearInterval(timerInterval);
		resetBoard();
	}

	function resetBoard() {
		isFirstClick = true;
		grid = createGrid(currentSize.rows, currentSize.cols);
		minesLeft = currentSize.mines;
		cursor = {
			r: Math.floor(currentSize.rows / 2),
			c: Math.floor(currentSize.cols / 2)
		};
	}

	function startSession() {
		if (gameState === 'playing') return;
		gameState = 'playing';
		timerInterval = setInterval(() => {
			if (gameMode === 'time') timer--;
			else timer++;
			clickHistory.push(clicksThisSecond);
			clickHistory = clickHistory;
			clicksThisSecond = 0;
			if (gameMode === 'time' && timer <= 0) finishSession(true);
		}, 1000);
	}

	function finishSession(win: boolean) {
		gameState = 'finished';
		isWin = win;
		if (timerInterval) clearInterval(timerInterval);
		if (clicksThisSecond > 0) clickHistory.push(clicksThisSecond);

		if (gameMode === 'standard') {
			gridsPlayed = 1;
			sessionTotalMines = currentSize.mines;
			totalCellsRevealed = win ? (currentSize.rows * currentSize.cols - currentSize.mines) : countCurrentSafeOpen();
		} else {
			if (win) {
				totalCellsRevealed += countCurrentSafeOpen();
				sessionTotalMines += currentSize.mines;
				gridsPlayed++;
			}
		}
		if (!win) sessionErrors += countWrongFlags();
		finalAccuracy = calculateAccuracy();
		grid = [...grid];
		if (win) triggerWin();
		saveResult(win);
	}

	function handleClick(r: number, c: number) {
		if (gameState === 'finished' || grid[r][c].isFlagged) return;
		totalClicks++;
		clicksThisSecond++;
		if (isFirstClick) {
			isFirstClick = false;
			if (gameState === 'pending') startSession();
			placeMines(grid, currentSize.mines, { r, c });
			currentGrid3BV = calculate3BV(grid);
			if (gameMode === 'standard') session3BV = currentGrid3BV;
		}
		const result = revealCell(grid, r, c);
		grid = result.grid;
		if (result.gameOver) {
			triggerExplosion();
			sessionErrors++;
			sessionErrors += countWrongFlags();
			finishSession(false);
		} else {
			checkWin();
		}
	}

	function toggleFlag(r: number, c: number) {
		if (gameState === 'finished' || grid[r][c].isOpen) return;
		grid[r][r].isFlagged = !grid[r][c].isFlagged;
		minesLeft += grid[r][c].isFlagged ? -1 : 1;
		totalClicks++;
		clicksThisSecond++;
		grid = grid;
	}

	function attemptChord(r: number, c: number) {
		const cell = grid[r][c];
		let flagCount = 0;
		DIRECTIONS.forEach(([dr, dc]) => {
			if (grid[r + dr]?.[c + dc]?.isFlagged) flagCount++;
		});
		if (flagCount === cell.neighborCount) {
			totalClicks++;
			clicksThisSecond++;
			DIRECTIONS.forEach(([dr, dc]) => {
				const nr = r + dr, nc = c + dc;
				if (grid[nr]?.[nc] && !grid[nr][nc].isOpen && !grid[nr][nc].isFlagged) handleClick(nr, nc);
			});
		}
	}

	function handleInput(e: KeyboardEvent) {
		if (showPalette) {
			if (e.key === 'Escape') {
				if (paletteView === 'themes') { paletteView = 'root'; searchQuery = ''; }
				else showPalette = false;
			}
			return;
		}
		if (isSearchMode) {
			e.preventDefault();
			if (e.key === 'Escape') { isSearchMode = false; searchTerm = ''; }
			else if (e.key === 'Enter') { executeSearch(); isSearchMode = false; }
			else if (e.key === 'Backspace') searchTerm = searchTerm.slice(0, -1);
			else if (/^[0-8]$/.test(e.key)) searchTerm = e.key;
			return;
		}
		const activeEl = document.activeElement;
		if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
		if (e.metaKey || e.ctrlKey || e.altKey) return;

		if (e.key === 'Tab') { e.preventDefault(); fullReset(); return; }
		if (e.key === 'Escape') {
			e.preventDefault();
			if (vimBuffer.length > 0) vimBuffer = '';
			else if (gameState === 'playing') finishSession(true);
			else openPalette();
			return;
		}

		const now = Date.now();
		if (e.key === 'g' && lastKey === 'g' && now - lastKeyTime < 500) {
			cursor = { r: 0, c: cursor.c };
			lastKey = ''; vimBuffer = ''; return;
		}
		if (e.key === 'g') { lastKey = 'g'; lastKeyTime = now; return; }

		const action = handleVimKey(e.key);
		if (action) {
			e.preventDefault();
			if (action.type === 'START_SEARCH') { isSearchMode = true; searchTerm = ''; return; }
			if (action.type === 'NEXT_MATCH' && searchMatches.length > 0) {
				matchIndex = (matchIndex + 1) % searchMatches.length;
				cursor = searchMatches[matchIndex]; return;
			}
			if (action.type === 'PREV_MATCH' && searchMatches.length > 0) {
				matchIndex = (matchIndex - 1 + searchMatches.length) % searchMatches.length;
				cursor = searchMatches[matchIndex]; return;
			}
			if (action.type === 'DIGIT') { vimBuffer += action.value; return; }
			if (action.type === 'ZERO') {
				if (vimBuffer.length > 0) vimBuffer += '0';
				else cursor = { r: cursor.r, c: 0 }; return;
			}
			if (action.type === 'START_ROW') { cursor = { r: cursor.r, c: 0 }; vimBuffer = ''; return; }
			if (action.type === 'GO_BOTTOM') { cursor = { r: currentSize.rows - 1, c: cursor.c }; vimBuffer = ''; return; }

			const mult = vimBuffer.length > 0 ? parseInt(vimBuffer) : 1;
			if (action.type === 'MOVE_CURSOR') {
				cursor.r = Math.max(0, Math.min(currentSize.rows - 1, cursor.r + action.dy * mult));
				cursor.c = Math.max(0, Math.min(currentSize.cols - 1, cursor.c + action.dx * mult));
				vimBuffer = '';
			} else if (action.type === 'FLAG') { toggleFlag(cursor.r, cursor.c); vimBuffer = ''; }
			else if (action.type === 'REVEAL') { handleClick(cursor.r, cursor.c); vimBuffer = ''; }
			else if (action.type === 'SMART') {
				if (!grid[cursor.r][cursor.c].isOpen) toggleFlag(cursor.r, cursor.c);
				else attemptChord(cursor.r, cursor.c);
				vimBuffer = '';
			}
		}
	}

	function executeSearch() {
		if (!searchTerm) return;
		const target = parseInt(searchTerm);
		searchMatches = [];
		for (let r = 0; r < currentSize.rows; r++) {
			for (let c = 0; c < currentSize.cols; c++) {
				const cell = grid[r][c];
				if (target === 0 ? !cell.isOpen : (cell.isOpen && cell.neighborCount === target)) {
					searchMatches.push({ r, c });
				}
			}
		}
		if (searchMatches.length > 0) {
			matchIndex = searchMatches.findIndex(m => m.r > cursor.r || (m.r === cursor.r && m.c >= cursor.c));
			if (matchIndex === -1) matchIndex = 0;
			cursor = searchMatches[matchIndex];
		}
	}

	function countCurrentSafeOpen() {
		let count = 0;
		grid.forEach(row => row.forEach(c => { if (c.isOpen && !c.isMine) count++; }));
		return count;
	}

	function countWrongFlags() {
		let wrong = 0;
		grid.forEach(row => row.forEach(c => { if (c.isFlagged && !c.isMine) wrong++; }));
		return wrong;
	}

	function calculateAccuracy() {
		if (sessionTotalMines === 0) return 0;
		return Math.max(0, Math.round(((sessionTotalMines - sessionErrors) / sessionTotalMines) * 100));
	}

	function checkWin() {
		let safeOpen = countCurrentSafeOpen();
		const totalSafe = currentSize.rows * currentSize.cols - currentSize.mines;
		if (safeOpen === totalSafe) {
			if (gameMode === 'time') {
				gridsSolved++; gridsPlayed++; session3BV += currentGrid3BV;
				totalCellsRevealed += totalSafe; sessionTotalMines += currentSize.mines;
				sessionErrors += countWrongFlags(); resetBoard();
			} else {
				gridsSolved = 1; finishSession(true);
			}
		}
	}

	function triggerExplosion() {
		confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ['#ef4444', '#dc2626', '#b91c1c'] });
	}

	function triggerWin() {
		confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#f59e0b'] });
	}

	onMount(async () => {
		const { data: { session } } = await supabase.auth.getSession();
		if (session?.user) currentUser = session.user.user_metadata.full_name || session.user.email?.split('@')[0];
		fullReset();
	});

	async function handleLogout() {
		await supabase.auth.signOut();
		currentUser = null;
		fullReset();
	}

// inside +page.svelte

async function saveResult(win: boolean) {
    // Get the current user session
    const { data: { session } } = await supabase.auth.getSession();
    
    let timeTaken = gameMode === 'standard' ? timer : Math.max(0, timeLimit - timer);
    
    // Explicitly handle the user_id for the insert
    const { error } = await supabase.from('game_results').insert({
        user_id: session?.user?.id || null, // Saves as NULL if not logged in
        mode: gameMode,
        setting: gameMode === 'time' ? timeLimit.toString() : currentSize.label,
        win,
        time: timeTaken,
        grids: gameMode === 'standard' ? (win ? 1 : 0) : gridsSolved,
        total_mines: win ? (gameMode === 'standard' ? currentSize.mines : gridsSolved * currentSize.mines) : 0,
        accuracy: finalAccuracy
    });
    
    if (error) console.error('Error saving result:', error);
}
</script>

<svelte:head>
	<title>Zsweep</title>
</svelte:head>

<svelte:window on:keydown={handleInput} on:mouseup={() => (isMouseDown = false)} />

<div class="relative flex min-h-screen flex-col items-center bg-bg font-mono text-text transition-colors duration-300">
	<div class="animate-in fade-in slide-in-from-top-4 mb-0 flex w-full max-w-5xl items-center justify-between p-8 duration-500">
		<div class="flex items-center gap-4 transition-all duration-300">
			<a href="{base}/" class="group flex select-none items-center gap-3 transition-all {gameState === 'playing' ? 'pointer-events-none opacity-50 grayscale' : 'hover:opacity-80'}">
				<Bomb size={28} strokeWidth={2.5} class="transition-transform duration-300 group-hover:scale-110 {gameState === 'playing' ? 'text-sub' : 'text-main'}" />
				<h1 class="font-mono text-3xl font-black leading-none tracking-tighter text-text">
					z<span class={gameState === 'playing' ? 'text-text' : 'text-main'}>sweep</span>
				</h1>
			</a>

			<a href="{base}/about" class="text-sub transition-all duration-300 hover:text-text {gameState === 'playing' ? 'pointer-events-none opacity-0' : 'opacity-100'}" title="About">
				<Info size={20} />
			</a>
		</div>

		<div class="flex items-center gap-6 text-sm transition-opacity duration-300 {gameState === 'playing' ? 'pointer-events-none opacity-0' : 'opacity-100'}">
			{#if currentUser}
				<div class="group relative z-20">
					<button class="flex items-center gap-2 rounded px-3 py-1.5 text-main transition-all hover:bg-sub/10">
						<User size={16} />
						<span class="font-bold">{currentUser}</span>
					</button>
					<div class="invisible absolute right-0 top-full pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
						<div class="flex min-w-[160px] flex-col rounded border border-sub/20 bg-bg p-1 font-mono text-sm shadow-xl">
							<a href="{base}/profile" class="flex items-center gap-2 rounded px-3 py-2 text-sub transition-colors hover:bg-sub/10 hover:text-text">
								<User size={14} /><span>Profile</span>
							</a>
							<div class="my-1 h-[1px] bg-sub/10"></div>
							<button on:click={handleLogout} class="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sub transition-colors hover:bg-error/10 hover:text-error">
								<LogOut size={14} /><span>Sign Out</span>
							</button>
						</div>
					</div>
				</div>
			{:else}
				<a href="/login" class="flex h-8 w-8 items-center justify-center rounded text-sub hover:bg-sub/10 hover:text-text">
					<User size={18} />
				</a>
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
			totalGlobalSeconds={data?.stats?.seconds || 0}
			on:restart={fullReset}
		/>
	{:else}
		<div class="mb-8 flex select-none items-center gap-6 rounded-lg bg-sub/10 px-4 py-2 text-xs transition-all duration-300 {gameState === 'playing' ? 'pointer-events-none opacity-0' : 'opacity-100'}">
			<div class="flex items-center gap-3">
				<button class="flex items-center gap-2 transition-colors {gameMode === 'time' ? 'font-bold text-main' : 'text-sub'}" on:click={() => setMode('time')}>
					<Hourglass size={12} /><span>time</span>
				</button>
				<button class="flex items-center gap-2 transition-colors {gameMode === 'standard' ? 'font-bold text-main' : 'text-sub'}" on:click={() => setMode('standard')}>
					<InfinityIcon size={12} /><span>standard</span>
				</button>
			</div>
			<div class="h-3 w-[1px] bg-sub/20"></div>
			<div class="flex items-center gap-3">
				<Grid3x3 size={12} class="text-sub opacity-50" />
				{#each GRID_SIZES as size}
					<button class="{currentSize.label === size.label ? 'font-bold text-main' : 'text-sub hover:text-text'}" on:click={() => setSize(size)}>{size.label}</button>
				{/each}
				<button class="text-sub hover:text-text" on:click={openPalette}><Wrench size={12} /></button>
			</div>
		</div>

		<div class="animate-in fade-in flex flex-col gap-2 duration-300">
			<div class="mb-2 flex select-none items-end justify-between px-1 text-main">
				<div class="flex w-12 flex-col">
					<span class="text-[10px] font-bold uppercase text-sub opacity-50">time</span>
					<span class="text-3xl font-bold leading-none text-main">{timer}</span>
				</div>
				<div class="flex w-12 flex-col text-right">
					<span class="text-[10px] font-bold uppercase text-sub opacity-50">mines</span>
					<span class="text-3xl font-bold leading-none">{minesLeft}</span>
				</div>
			</div>

			<div class="grid select-none gap-1 bg-bg transition-all duration-300" style="grid-template-columns: repeat({currentSize.cols}, minmax(0, 1fr));" on:mousedown={() => { if (gameState === 'playing') isMouseDown = true; }}>
				{#each grid as row, r (r)}
					{#each row as cell, c (c)}
						<button class="flex h-8 w-8 items-center justify-center rounded-sm text-sm font-bold transition-all duration-75 focus:outline-none {cell.isOpen ? 'bg-sub/10' : 'bg-sub/30 hover:bg-sub/50'} {cell.isMine && cell.isOpen ? 'bg-error text-bg' : ''} {cell.isMine && !cell.isOpen && gameState === 'finished' ? 'bg-error/50 opacity-50' : ''} {cursor.r === r && cursor.c === c ? 'z-10 ring-2 ring-main/50 brightness-110' : ''}" on:click={() => handleClick(r, c)} on:contextmenu|preventDefault={() => toggleFlag(r, c)} on:mouseenter={() => { cursor = { r, c }; }}>
							{#if cell.isOpen}
								{#if cell.isMine}
									<Bomb size={16} />
								{:else if cell.neighborCount > 0}
									<span class={cell.neighborCount === 1 ? 'text-blue-400' : cell.neighborCount === 2 ? 'text-green-400' : cell.neighborCount === 3 ? 'text-red-400' : 'text-purple-400'}>{cell.neighborCount}</span>
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
		<div class="animate-in fade-in fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm duration-150" on:mousedown|self={() => (showPalette = false)}>
			<div class="mt-[15vh] flex max-h-[50vh] w-[450px] flex-col overflow-hidden rounded-lg border border-sub/20 bg-bg font-mono text-text shadow-2xl">
				<div class="flex items-center gap-3 border-b border-sub/10 p-3">
					<Search size={14} class="text-main" />
					<input bind:this={searchInputEl} bind:value={searchQuery} type="text" placeholder={paletteView === 'root' ? 'Type to search...' : 'Search themes...'} class="h-full w-full border-none bg-transparent text-xs text-text outline-none placeholder:text-sub/50" />
				</div>
				<div class="overflow-y-auto p-1.5">
					{#if paletteView === 'root'}
						{#each filteredCommands as cmd}
							<button class="group flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-sub/10" on:click={cmd.action}>
								<div class="flex items-center gap-3">
									<svelte:component this={cmd.icon} size={12} class="text-sub group-hover:text-main" />
									<span class="text-sub/80 group-hover:text-text">{cmd.label}</span>
								</div>
								<ChevronRight size={12} class="text-sub/40 group-hover:text-main" />
							</button>
						{/each}
					{:else if paletteView === 'themes'}
						{#each filteredThemes as theme}
							<button class="group flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors hover:bg-sub/10" on:click={() => { $currentTheme = theme; showPalette = false; }}>
								<span class="text-sub/80 group-hover:text-text">{theme.label}</span>
							</button>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	{/if}

	{#if isSearchMode}
		<div class="animate-in fade-in slide-in-from-bottom-2 fixed bottom-20 left-1/2 z-50 -translate-x-1/2">
			<div class="flex items-center gap-2 rounded-full border border-main/20 bg-bg px-4 py-2 shadow-2xl">
				<span class="font-bold text-main">/</span>
				<span class="min-w-[10px] font-mono text-lg text-text">{searchTerm}</span>
				<span class="animate-pulse text-main">_</span>
			</div>
		</div>
	{/if}
</div>
