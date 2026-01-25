<script lang="ts">
	import GameGrid from '$lib/components/GameGrid.svelte';

	export let pattern: '1-2-1' | '1-2-2-1' | 'wall-3';
	export let title: string;
	export let desc: string;

	function makeCell(r: number, c: number, overrides = {}): any {
		return {
			row: r,
			col: c,
			isMine: false,
			isOpen: false,
			isFlagged: false,
			neighborCount: 0,
			...overrides
		};
	}

	let grid: any[][] = [];
	let cols = 5;

	function get121() {
		return [
			[
				makeCell(0, 0, { isMine: true, isFlagged: true }),
				makeCell(0, 1),
				makeCell(0, 2, { isMine: true, isFlagged: true }),
				makeCell(0, 3),
				makeCell(0, 4)
			],
			[
				makeCell(1, 0, { isOpen: true, neighborCount: 1 }),
				makeCell(1, 1, { isOpen: true, neighborCount: 2 }),
				makeCell(1, 2, { isOpen: true, neighborCount: 1 }),
				makeCell(1, 3, { isOpen: true, neighborCount: 1 }),
				makeCell(1, 4, { isOpen: true, neighborCount: 0 })
			]
		];
	}

	function get1221() {
		return [
			[
				makeCell(0, 0),
				makeCell(0, 1, { isMine: true, isFlagged: true }),
				makeCell(0, 2, { isMine: true, isFlagged: true }),
				makeCell(0, 3),
				makeCell(0, 4)
			],
			[
				makeCell(1, 0, { isOpen: true, neighborCount: 1 }),
				makeCell(1, 1, { isOpen: true, neighborCount: 2 }),
				makeCell(1, 2, { isOpen: true, neighborCount: 2 }),
				makeCell(1, 3, { isOpen: true, neighborCount: 1 }),
				makeCell(1, 4, { isOpen: true, neighborCount: 0 })
			]
		];
	}

	function getWall3() {
		return [
			[
				makeCell(0, 0, { isMine: true, isFlagged: true }),
				makeCell(0, 1, { isMine: true, isFlagged: true }),
				makeCell(0, 2, { isMine: true, isFlagged: true })
			],
			[
				makeCell(1, 0, { isOpen: true, neighborCount: 2 }),
				makeCell(1, 1, { isOpen: true, neighborCount: 3 }),
				makeCell(1, 2, { isOpen: true, neighborCount: 2 })
			]
		];
	}

	if (pattern === '1-2-1') {
		grid = get121();
		cols = 5;
	} else if (pattern === '1-2-2-1') {
		grid = get1221();
		cols = 5;
	} else if (pattern === 'wall-3') {
		grid = getWall3();
		cols = 3;
	}
</script>

<div class="rounded-lg border border-main/10 bg-bg p-6 shadow-sm transition hover:border-main/30">
	<h3 class="mb-2 font-mono text-lg font-bold text-main">{title}</h3>

	<div class="mb-4 flex justify-center rounded bg-sub/5 p-6">
		<GameGrid {grid} numCols={cols} gameState="playing" cursor={{ r: -1, c: -1 }} />
	</div>

	<p class="text-sm leading-relaxed text-sub">{desc}</p>
</div>
