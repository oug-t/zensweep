<script lang="ts">
	import { Search, ChevronRight, Palette } from 'lucide-svelte';
	import { THEMES } from '$lib/themes';
	import { currentTheme } from '$lib/themeStore';
	import { tick } from 'svelte';

	export let show = false;

	let paletteView: 'root' | 'themes' = 'root';
	let searchQuery = '';
	let searchInputEl: HTMLInputElement;

	let selectedIndex = 0;

	$: if (show) {
		paletteView = 'root';
		searchQuery = '';
		selectedIndex = 0;
		tick().then(() => searchInputEl?.focus());
	}

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
				selectedIndex = 0;
				tick().then(() => searchInputEl?.focus());
			}
		}
	];

	$: filteredCommands = COMMANDS.filter((c) =>
		c.label.toLowerCase().includes(searchQuery.toLowerCase())
	);

	$: currentItems = paletteView === 'root' ? filteredCommands : filteredThemes;

	function handleKeydown(e: KeyboardEvent) {
		if (!show) return;

		if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
			e.stopPropagation();
		}

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % currentItems.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + currentItems.length) % currentItems.length;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			executeSelection(currentItems[selectedIndex]);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			// If in submenu, go back; otherwise close
			if (paletteView === 'themes') {
				paletteView = 'root';
				searchQuery = '';
				selectedIndex = 0;
			} else {
				close();
			}
		}
	}

	function executeSelection(item: any) {
		if (!item) return;

		if (paletteView === 'root') {
			item.action();
		} else {
			// It's a theme
			$currentTheme = item;
			close();
		}
	}

	function close() {
		show = false;
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
	<div
		role="dialog"
		aria-modal="true"
		class="animate-in fade-in fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-sm duration-150"
		on:mousedown|self={close}
	>
		<div
			class="mt-[15vh] flex max-h-[50vh] w-[450px] flex-col overflow-hidden rounded-lg border border-sub/20 bg-bg font-mono text-text shadow-2xl"
		>
			<div class="flex items-center gap-3 border-b border-sub/10 p-3">
				<Search size={14} class="text-main" />
				<input
					bind:this={searchInputEl}
					bind:value={searchQuery}
					on:input={() => (selectedIndex = 0)}
					type="text"
					placeholder={paletteView === 'root' ? 'Type to search...' : 'Search themes...'}
					class="h-full w-full border-none bg-transparent text-xs text-text outline-none placeholder:text-sub/50"
				/>
			</div>

			<div class="overflow-y-auto p-1.5">
				{#if currentItems.length === 0}
					<div class="p-4 text-center text-xs text-sub/50">No results found.</div>
				{:else}
					{#each currentItems as item, i}
						<button
							class="group flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors
                            {i === selectedIndex
								? 'bg-sub/20 text-text'
								: 'text-sub hover:bg-sub/10 hover:text-text'}"
							on:click={() => executeSelection(item)}
							on:mouseenter={() => (selectedIndex = i)}
						>
							{#if paletteView === 'root'}
								<div class="flex items-center gap-3">
									<svelte:component
										this={'icon' in item ? item.icon : Palette}
										size={12}
										class={i === selectedIndex ? 'text-main' : 'text-sub'}
									/>
									<span>{item.label}</span>
								</div>
								<ChevronRight size={12} class="opacity-50" />
							{:else}
								<span>{item.label}</span>
							{/if}
						</button>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}
