<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Bomb, Flag } from 'lucide-svelte';
	import type { Cell } from '$lib/minesweeper';

	export let grid: Cell[][] = [];
	export let cursor: { r: number; c: number } = { r: 0, c: 0 };
	export let numCols: number;
	export let gameState: 'pending' | 'playing' | 'finished' = 'pending';
	export let vimMode: boolean = false;

	const dispatch = createEventDispatcher();

	function handleLeftClick(r: number, c: number) {
		dispatch('click', { r, c });
	}

	function handleRightClick(r: number, c: number) {
		dispatch('flag', { r, c });
	}

	function handleHover(r: number, c: number) {
		dispatch('hover', { r, c });
	}

	function handleMouseDown() {
		dispatch('mousedown');
	}
</script>

<div
	class="grid select-none gap-1 bg-bg transition-all duration-300 {vimMode ? 'cursor-none' : ''}"
	style="grid-template-columns: repeat({numCols}, minmax(0, 1fr));"
	on:mousedown={handleMouseDown}
	on:contextmenu|preventDefault
	role="grid"
>
	{#each grid as row, r (r)}
		{#each row as cell, c (c)}
			<button
				type="button"
				class="flex h-8 w-8 items-center justify-center rounded-sm text-sm font-bold transition-all duration-75 focus:outline-none
          {vimMode ? 'cursor-none' : 'cursor-default'}
          {cell.isOpen ? 'bg-sub/10' : `bg-sub/30 ${!vimMode ? 'hover:bg-sub/50' : ''}`}
          {cell.isMine && cell.isOpen ? 'bg-error text-bg' : ''}
          {cell.isMine && !cell.isOpen && gameState === 'finished' ? 'bg-error/50 opacity-50' : ''}
          {vimMode && cursor.r === r && cursor.c === c
					? 'z-10 ring-2 ring-main/50 brightness-110'
					: ''}"
				on:click={() => handleLeftClick(r, c)}
				on:contextmenu|preventDefault={() => handleRightClick(r, c)}
				on:mouseenter={() => handleHover(r, c)}
				aria-label={cell.isOpen
					? cell.isMine
						? 'Bomb'
						: `${cell.neighborCount} mines nearby`
					: cell.isFlagged
						? 'Flagged'
						: `Row ${r + 1} Column ${c + 1}`}
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
										: 'text-purple-400'}
						>
							{cell.neighborCount}
						</span>
					{/if}
				{:else if cell.isFlagged}
					<span class="text-error">
						<Flag size={14} fill="currentColor" />
					</span>
				{/if}
			</button>
		{/each}
	{/each}
</div>
