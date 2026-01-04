<script lang="ts">
  import { createGrid, placeMines, revealCell, DIRECTIONS, type Cell } from '$lib/minesweeper';
  import { onMount, onDestroy } from 'svelte';
  import { Flag, Bomb, Grid3x3, Wrench, X, Flame, Skull, Flower2, User, LogOut, Clock, Hourglass, Infinity as InfinityIcon } from 'lucide-svelte';
  import ResultView from '$lib/ResultView.svelte';

  const GRID_SIZES = [
    { label: '9x9', rows: 9, cols: 9, mines: 10 },
    { label: '16x16', rows: 16, cols: 16, mines: 40 },
    { label: '30x16', rows: 16, cols: 30, mines: 99 }
  ];

  const TIME_OPTIONS = [15, 30, 60, 120];

  // --- SETTINGS ---
  let gameMode: 'time' | 'standard' = 'time'; 
  let currentSize = GRID_SIZES[0]; 
  let timeLimit = 30;
  let customTime = 60;
  let isCustomTime = false;

  let showCustomModal = false;
  let customRows = 20, customCols = 20, customMines = 50;

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
  
  // Time Mode Stats
  let gridsSolved = 0;
  let gridsPlayed = 0;
  let totalCellsRevealed = 0; 
  
  // New Accuracy Stats
  let sessionTotalMines = 0; // Total mines across all grids played
  let sessionErrors = 0;     // Total explosions + wrong flags
  let finalAccuracy = 0;
  
  let isMouseDown = false;
  let hoveredCell: { r: number, c: number } | null = null;
  let currentUser: string | null = null;

  $: StatusIcon = (() => {
    if (gameState === 'finished') return Flower2;
    if (isMouseDown && gameState !== 'pending') return Flame;
    return Bomb;
  })();

  function setMode(mode: 'time' | 'standard') {
      gameMode = mode;
      fullReset();
  }

  function setSize(size: typeof GRID_SIZES[0]) {
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

  function applyCustom() {
    if (customRows < 5) customRows = 5;
    if (customCols < 5) customCols = 5;
    const maxMines = (customRows * customCols) - 9; 
    if (customMines > maxMines) customMines = maxMines;
    
    currentSize = { label: 'custom', rows: customRows, cols: customCols, mines: customMines };
    showCustomModal = false;
    fullReset();
  }

  function countCurrentSafeOpen() {
      let count = 0;
      for(let row of grid) {
          for(let cell of row) {
              if (cell.isOpen && !cell.isMine) count++;
          }
      }
      return count;
  }

  // Helper: Count wrong flags on current board
  function countWrongFlags() {
      let wrong = 0;
      for(let row of grid) {
          for(let cell of row) {
              // Mistake: Flagged but safe
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

  // --- GAME LOGIC ---

  function fullReset() {
    gameState = 'pending';
    gridsSolved = 0;
    gridsPlayed = 0;
    totalCellsRevealed = 0;
    totalClicks = 0;
    
    // Reset Accuracy Stats
    sessionTotalMines = 0;
    sessionErrors = 0;
    finalAccuracy = 0;

    clickHistory = []; 
    clicksThisSecond = 0;
    
    timer = (gameMode === 'time') ? timeLimit : 0;
    
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
            finishSession();
        }
    }, 1000);
  }

  function finishSession() {
    gameState = 'finished';
    clearInterval(timerInterval);
    if (clicksThisSecond > 0) clickHistory.push(clicksThisSecond);
    
    // Tally up the final (incomplete) grid stats
    gridsPlayed++;
    totalCellsRevealed += countCurrentSafeOpen();
    
    // Accuracy for final grid
    sessionTotalMines += currentSize.mines;
    sessionErrors += countWrongFlags(); // No explosion error since time ran out

    finalAccuracy = calculateAccuracy();
    
    grid = [...grid]; 
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
        grid = [...grid];
    }

    const result = revealCell(grid, r, c);
    grid = result.grid; 
    
    if (result.gameOver) {
        if (gameMode === 'time') {
            handleGridEnd(false);
        } else {
            // Standard Mode Fail
            sessionTotalMines += currentSize.mines;
            sessionErrors += 1; // Explosion
            sessionErrors += countWrongFlags();
            finalAccuracy = calculateAccuracy();
            finishSession();
        }
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
      const totalSafeCells = (currentSize.rows * currentSize.cols) - currentSize.mines;
      for(let row of grid) {
          for(let cell of row) {
              if (cell.isOpen && !cell.isMine) safeCellsOpen++;
          }
      }
      if (safeCellsOpen === totalSafeCells) {
          if (gameMode === 'time') {
              handleGridEnd(true);
          } else {
              // Standard Mode Win
              gridsSolved = 1;
              gridsPlayed = 1;
              totalCellsRevealed += totalSafeCells;
              
              // Perfect Accuracy on Win
              sessionTotalMines += currentSize.mines;
              // No errors (wrong flags impossible if you won by opening safe cells)
              finalAccuracy = 100;
              
              gameState = 'finished';
              clearInterval(timerInterval);
              if (clicksThisSecond > 0) clickHistory.push(clicksThisSecond);
              grid = [...grid];
          }
      }
  }

  function handleGridEnd(win: boolean) {
      gridsPlayed++;
      
      // Accumulate Accuracy Stats
      sessionTotalMines += currentSize.mines;
      
      if (!win) {
          sessionErrors += 1; // The mine you clicked
      }
      
      // Count any wrong flags currently on board
      sessionErrors += countWrongFlags();
      
      // Count Cells
      if (win) {
          gridsSolved++;
          totalCellsRevealed += (currentSize.rows * currentSize.cols) - currentSize.mines;
      } else {
          totalCellsRevealed += countCurrentSafeOpen();
      }
      
      resetBoard();
  }

  function handleInput(e: KeyboardEvent) {
    if (showCustomModal) return; 

    if (e.key === 'Tab') {
        e.preventDefault();
        fullReset();
        return;
    }
    
    if (e.key === 'Escape') {
        finishSession();
        return;
    }

    if (e.code === 'Space') {
      e.preventDefault(); 
      if (gameState === 'finished') {
        fullReset();
        return;
      }
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
        const nr = r + dr, nc = c + dc;
        if (grid[nr] && grid[nr][nc] && grid[nr][nc].isFlagged) flagCount++;
    });

    if (flagCount === cell.neighborCount) {
        totalClicks++; 
        clicksThisSecond++;
        DIRECTIONS.forEach(([dr, dc]) => {
            const nr = r + dr, nc = c + dc;
            if (grid[nr] && grid[nr][nc]) handleClick(nr, nc);
        });
    }
  }

  onMount(() => {
    const savedUser = localStorage.getItem('zensweep_user');
    if (savedUser) currentUser = savedUser;
    fullReset();
  });

  function handleLogout() {
    currentUser = null;
    localStorage.removeItem('zensweep_user');
  }

  onDestroy(() => clearInterval(timerInterval));
</script>

<svelte:window 
    on:keydown={handleInput} 
    on:mouseup={() => isMouseDown = false}
/>

<div class="min-h-screen bg-bg text-text flex flex-col items-center font-mono">
  
  <div class="w-full max-w-5xl flex justify-between items-center p-8 mb-0 animate-in fade-in slide-in-from-top-4 duration-500">
      <div class="flex items-center gap-2 select-none">
          <Bomb size={24} class="text-main" />
          <h1 class="text-2xl font-bold text-text tracking-tight">zen<span class="text-main">sweep</span></h1>
      </div>

      <div class="flex items-center gap-6 text-sm">
          {#if currentUser}
              <div class="flex items-center gap-4">
                  <div class="flex items-center gap-2 text-main">
                      <User size={16} />
                      <span class="font-bold">{currentUser}</span>
                  </div>
                  <button on:click={handleLogout} class="opacity-50 hover:opacity-100 hover:text-error transition-all" title="Log Out"><LogOut size={16} /></button>
              </div>
          {:else}
              <a href="/login" class="flex items-center justify-center w-8 h-8 rounded hover:bg-sub/10 text-sub hover:text-text transition-colors"><User size={18} /></a>
          {/if}
      </div>
  </div>

  {#if gameState === 'finished'}
    
    <ResultView 
        win={true} 
        time={gameMode === 'time' ? (timeLimit - timer) : timer} 
        cells={totalCellsRevealed} 
        {totalClicks}
        history={clickHistory}
        accuracy={finalAccuracy} sizeLabel="{currentSize.label}"
        {gridsSolved}
        {gridsPlayed}
        mode={gameMode}
        on:restart={fullReset}
    />

  {:else}

    <div class="flex items-center gap-6 bg-sub/10 px-4 py-2 rounded-lg mb-8 text-xs select-none transition-all hover:bg-sub/15">
        
        <div class="flex items-center gap-3">
            <button 
                class="flex items-center gap-2 transition-colors {gameMode === 'time' ? 'text-main font-bold' : 'text-sub hover:text-text'}"
                on:click={() => setMode('time')}
            >
                <Hourglass size={12} />
                <span>time</span>
            </button>
            <button 
                class="flex items-center gap-2 transition-colors {gameMode === 'standard' ? 'text-main font-bold' : 'text-sub hover:text-text'}"
                on:click={() => setMode('standard')}
            >
                <InfinityIcon size={12} />
                <span>standard</span>
            </button>
        </div>

        <div class="w-[1px] h-3 bg-sub/20"></div>

        {#if gameMode === 'time'}
            <div class="flex items-center gap-3">
                <Clock size={12} class="text-sub opacity-50" />
                {#each TIME_OPTIONS as t}
                    <button 
                        class="transition-colors duration-200 {timeLimit === t && !isCustomTime ? 'text-main font-bold' : 'text-sub hover:text-text'}"
                        on:click={() => setTime(t)}
                    >
                        {t}
                    </button>
                {/each}
                <button class="transition-colors duration-200 {isCustomTime ? 'text-main' : 'text-sub hover:text-text'}" on:click={setCustomTime}>
                    <Wrench size={12} />
                </button>
            </div>
            
            <div class="w-[1px] h-3 bg-sub/20"></div>
        {/if}

        <div class="flex items-center gap-3">
            <Grid3x3 size={12} class="text-sub opacity-50" />
            {#each GRID_SIZES as size}
                <button 
                    class="transition-colors duration-200 {currentSize.label === size.label ? 'text-main font-bold' : 'text-sub hover:text-text'}"
                    on:click={() => setSize(size)}
                >
                    {size.label}
                </button>
            {/each}
            <button class="transition-colors duration-200 {currentSize.label === 'custom' ? 'text-main' : 'text-sub hover:text-text'}" on:click={() => showCustomModal = true}>
                <Wrench size={12} />
            </button>
        </div>
    </div>

    <div class="flex flex-col gap-2 animate-in fade-in duration-300">
        
        <div class="flex items-end justify-between px-1 text-main select-none mb-2">
            <div class="flex flex-col w-12">
              <span class="text-[10px] text-sub uppercase font-bold opacity-50">time</span>
              <span class="text-3xl font-bold leading-none text-main">{timer}</span>
            </div>

            {#if gameMode === 'time'}
                <div class="flex flex-col items-center opacity-50">
                     <span class="text-[10px] uppercase font-bold">solved</span>
                     <span class="text-xl font-bold">{gridsSolved}/{gridsPlayed}</span>
                </div>
            {/if}

            <div class="flex flex-col w-12 text-right">
              <span class="text-[10px] text-sub uppercase font-bold opacity-50">mines</span>
              <span class="text-3xl font-bold leading-none">{minesLeft}</span>
            </div>
        </div>

        <div 
          class="grid gap-1 bg-bg select-none transition-all duration-300 ease-in-out"
          style="grid-template-columns: repeat({currentSize.cols}, minmax(0, 1fr));"
          on:mousedown={() => { if(gameState === 'playing') isMouseDown = true }}
        >
          {#each grid as row, r (r)}
            {#each row as cell, c (c)}
              <button
                class="w-8 h-8 flex items-center justify-center text-sm font-bold rounded-sm transition-all duration-75 focus:outline-none
                {cell.isOpen ? 'bg-sub/10' : 'bg-sub/30 hover:bg-sub/50'}
                {cell.isMine && cell.isOpen ? 'bg-error text-bg' : ''}
                {cell.isMine && !cell.isOpen && gameState === 'finished' ? 'opacity-50 bg-error/50' : ''} 
                {hoveredCell?.r === cell.row && hoveredCell?.c === cell.col ? 'brightness-125 ring-2 ring-main/20 z-10' : ''}
                "
                on:click={() => handleClick(cell.row, cell.col)}
                on:contextmenu|preventDefault={() => toggleFlag(cell.row, cell.col)}
                on:mouseenter={() => hoveredCell = { r: cell.row, c: cell.col }}
                on:mouseleave={() => hoveredCell = null}
              >
                {#if cell.isOpen}
                  {#if cell.isMine} 
                    <Bomb size={16} /> 
                  {:else if cell.neighborCount > 0}
                    <span class={
                      cell.neighborCount === 1 ? 'text-blue-400' :
                      cell.neighborCount === 2 ? 'text-green-400' :
                      cell.neighborCount === 3 ? 'text-red-400' : 'text-purple-400'
                    }>
                      {cell.neighborCount}
                    </span>
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

  {#if showCustomModal}
    <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
        <div class="bg-[#191919] border border-sub/20 p-6 rounded-lg shadow-xl w-80 text-text font-mono">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-bold text-main">Custom Config</h2>
                <button on:click={() => showCustomModal = false} class="text-sub hover:text-text"><X size={20} /></button>
            </div>
            <div class="space-y-4">
                <div class="flex flex-col gap-1">
                    <label class="text-xs text-sub uppercase">Rows</label>
                    <input type="number" bind:value={customRows} class="bg-sub/10 border border-sub/20 rounded p-2 text-text outline-none" />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-xs text-sub uppercase">Columns</label>
                    <input type="number" bind:value={customCols} class="bg-sub/10 border border-sub/20 rounded p-2 text-text outline-none" />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-xs text-sub uppercase">Mines</label>
                    <input type="number" bind:value={customMines} class="bg-sub/10 border border-sub/20 rounded p-2 text-text outline-none" />
                </div>
            </div>
            <button on:click={applyCustom} class="w-full mt-6 bg-sub/20 hover:bg-main hover:text-bg text-main font-bold py-2 rounded transition-colors">Start</button>
        </div>
    </div>
  {/if}

</div>
