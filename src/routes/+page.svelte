<script lang="ts">
  import { createGrid, placeMines, revealCell, DIRECTIONS, type Cell } from '$lib/minesweeper';
  import { onMount, onDestroy } from 'svelte';
  import { Flag, Bomb, Grid3x3, Wrench, X, Flame, Skull, Flower2 } from 'lucide-svelte';
  import ResultView from '$lib/ResultView.svelte';

  const PRESETS = [
    { label: '9x9', rows: 9, cols: 9, mines: 10 },
    { label: '16x16', rows: 16, cols: 16, mines: 40 },
    { label: '30x16', rows: 16, cols: 30, mines: 99 }
  ];

  let activePresetLabel = '16x16'; 
  let rows = 16;
  let cols = 16;
  let mines = 40;

  let showCustomModal = false;
  let customRows = 20;
  let customCols = 20;
  let customMines = 50;

  let grid: Cell[][] = [];
  let gameState: 'pending' | 'playing' | 'won' | 'lost' = 'pending';
  let isFirstClick = true; 
  let timer = 0;
  let timerInterval: ReturnType<typeof setInterval> | undefined;
  let minesLeft = 0;
  
  let totalClicks = 0;
  let clickHistory: number[] = [];
  let clicksThisSecond = 0;
  let finalAccuracy = 0; 
  
  let isMouseDown = false;
  let hoveredCell: { r: number, c: number } | null = null;

  $: StatusIcon = (() => {
    if (gameState === 'won') return Flower2;
    if (gameState === 'lost') return Skull; 
    if (isMouseDown && gameState !== 'pending') return Flame;
    return Bomb;
  })();

  function applyPreset(preset: typeof PRESETS[0]) {
    activePresetLabel = preset.label;
    rows = preset.rows;
    cols = preset.cols;
    mines = preset.mines;
    startNewGame();
  }

  function applyCustom() {
    if (customRows < 5) customRows = 5;
    if (customCols < 5) customCols = 5;
    const maxMines = (customRows * customCols) - 9; 
    if (customMines > maxMines) customMines = maxMines;
    if (customMines < 1) customMines = 1;

    activePresetLabel = 'custom';
    rows = customRows;
    cols = customCols;
    mines = customMines;
    showCustomModal = false;
    startNewGame();
  }

  function startNewGame() {
    gameState = 'pending';
    isFirstClick = true;
    grid = createGrid(rows, cols);
    timer = 0;
    minesLeft = mines;
    totalClicks = 0;
    clickHistory = [];
    clicksThisSecond = 0;
    finalAccuracy = 0;
    clearInterval(timerInterval);
  }

  function startGameTimer() {
    if (gameState === 'playing') return;
    gameState = 'playing';
    timerInterval = setInterval(() => {
        timer++;
        clickHistory.push(clicksThisSecond);
        clickHistory = clickHistory; 
        clicksThisSecond = 0; 
    }, 1000);
  }

  function handleClick(r: number, c: number) {
    if (gameState === 'lost' || gameState === 'won') return;
    if (grid[r][c].isFlagged) return; 

    totalClicks++;
    clicksThisSecond++;

    if (isFirstClick) {
        isFirstClick = false;
        startGameTimer();
        placeMines(grid, mines, { r, c });
        grid = [...grid];
    }

    const result = revealCell(grid, r, c);
    grid = result.grid; 
    
    if (result.gameOver) {
        endGame(false);
    } else {
        checkWin();
    }
  }

  function toggleFlag(r: number, c: number) {
    if (gameState === 'lost' || gameState === 'won') return;
    
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
      const totalSafeCells = (rows * cols) - mines;
      for(let row of grid) {
          for(let cell of row) {
              if (cell.isOpen && !cell.isMine) safeCellsOpen++;
          }
      }
      if (safeCellsOpen === totalSafeCells) endGame(true);
  }

  function endGame(win: boolean) {
    gameState = win ? 'won' : 'lost';
    clearInterval(timerInterval);
    if (clicksThisSecond > 0) clickHistory.push(clicksThisSecond);
    
    // --- ACCURACY LOGIC ---
    if (win) {
        finalAccuracy = 100;
    } else {
        let wrongFlags = 0;
        let explodedMine = 1; 

        for(let row of grid) {
            for(let cell of row) {
                if (cell.isFlagged && !cell.isMine) {
                    wrongFlags++;
                }
            }
        }
        
        const errors = explodedMine + wrongFlags;
        const rawAcc = ((mines - errors) / mines) * 100;
        finalAccuracy = Math.max(0, Math.round(rawAcc));
    }

    grid = [...grid];
  }

  function handleInput(e: KeyboardEvent) {
    if (showCustomModal) return; 

    if (e.key === 'Tab') {
        e.preventDefault();
        startNewGame();
        return;
    }
    if (e.key === 'r') startNewGame();

    if (e.code === 'Space') {
      e.preventDefault(); 
      if (gameState === 'won' || gameState === 'lost') {
        startNewGame();
        return;
      }
      if (hoveredCell) {
        const { r, c } = hoveredCell;
        const cell = grid[r][c];
        
        if (!cell.isOpen) {
            toggleFlag(r, c);
        } else if (cell.neighborCount > 0) {
            attemptChord(r, c);
        }
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
            if (gameState === 'lost') return; 
            if (grid[nr] && grid[nr][nc]) handleClick(nr, nc);
        });
    }
  }

  onMount(() => startNewGame());
  onDestroy(() => clearInterval(timerInterval));
</script>

<svelte:window 
    on:keydown={handleInput} 
    on:mouseup={() => isMouseDown = false}
/>

<div class="min-h-screen bg-bg text-text flex flex-col items-center pt-16 font-mono">
  
  {#if gameState === 'won' || gameState === 'lost'}
    
    <ResultView 
        win={gameState === 'won'}
        time={timer} 
        {mines}
        {totalClicks}
        history={clickHistory}
        accuracy={finalAccuracy}
        sizeLabel="{rows}x{cols}"
        on:restart={startNewGame}
    />

  {:else}

    <div class="flex items-center gap-4 bg-sub/10 px-4 py-2 rounded-lg mb-8 text-sm select-none transition-all hover:bg-sub/15">
        <div class="flex items-center gap-2 text-sub font-bold opacity-75">
            <Grid3x3 size={14} />
            <span>size</span>
        </div>
        <div class="w-[2px] h-4 bg-sub/20 rounded-full"></div>
        <div class="flex items-center gap-4">
            {#each PRESETS as preset (preset.label)}
                <button 
                    class="transition-colors duration-200 {activePresetLabel === preset.label ? 'text-main font-bold' : 'text-sub hover:text-text'}"
                    on:click={() => applyPreset(preset)}
                >
                    {preset.label}
                </button>
            {/each}
            <button 
                class="transition-colors duration-200 {activePresetLabel === 'custom' ? 'text-main' : 'text-sub hover:text-text'}"
                on:click={() => showCustomModal = true}
                title="Custom Size"
            >
                <Wrench size={14} />
            </button>
        </div>
    </div>

    <div class="flex flex-col gap-2 animate-in fade-in duration-300">
        <div class="flex items-end justify-between px-1 text-main select-none">
            <div class="flex flex-col w-12">
              <span class="text-[10px] text-sub uppercase font-bold opacity-50">time</span>
              <span class="text-xl font-bold leading-none">{timer}</span>
            </div>

            <button 
                on:click={startNewGame}
                class="flex items-center justify-center text-main hover:text-white transition-transform active:scale-95"
            >
                <svelte:component this={StatusIcon} size={24} />
            </button>

            <div class="flex flex-col w-12 text-right">
              <span class="text-[10px] text-sub uppercase font-bold opacity-50">mines</span>
              <span class="text-xl font-bold leading-none">{minesLeft}</span>
            </div>
        </div>

        <div 
          class="grid gap-1 bg-bg select-none transition-all duration-300 ease-in-out"
          style="grid-template-columns: repeat({cols}, minmax(0, 1fr));"
          on:mousedown={() => { if(gameState === 'playing') isMouseDown = true }}
        >
          {#each grid as row, r (r)}
            {#each row as cell, c (c)}
              <button
                class="w-8 h-8 flex items-center justify-center text-sm font-bold rounded-sm transition-all duration-75 focus:outline-none
                {cell.isOpen ? 'bg-sub/10' : 'bg-sub/30 hover:bg-sub/50'}
                {cell.isMine && cell.isOpen ? 'bg-error text-bg' : ''}
                {gameState === 'lost' && cell.isMine && !cell.isOpen ? 'opacity-50 bg-error/50' : ''}
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
                <h2 class="text-xl font-bold text-main">Custom Size</h2>
                <button on:click={() => showCustomModal = false} class="text-sub hover:text-text">
                    <X size={20} />
                </button>
            </div>
            
            <div class="space-y-4">
                <div class="flex flex-col gap-1">
                    <label class="text-xs text-sub uppercase">Rows</label>
                    <input type="number" bind:value={customRows} class="bg-sub/10 border border-sub/20 rounded p-2 text-text focus:border-main focus:ring-0 outline-none" />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-xs text-sub uppercase">Columns</label>
                    <input type="number" bind:value={customCols} class="bg-sub/10 border border-sub/20 rounded p-2 text-text focus:border-main focus:ring-0 outline-none" />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-xs text-sub uppercase">Mines</label>
                    <input type="number" bind:value={customMines} class="bg-sub/10 border border-sub/20 rounded p-2 text-text focus:border-main focus:ring-0 outline-none" />
                </div>
            </div>

            <button 
                on:click={applyCustom}
                class="w-full mt-6 bg-sub/20 hover:bg-main hover:text-bg text-main font-bold py-2 rounded transition-colors"
            >
                Start Game
            </button>
        </div>
    </div>
  {/if}

</div>
