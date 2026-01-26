<script lang="ts">
	import { Keyboard, Hash, Gamepad2 } from 'lucide-svelte';
	import PatternDemo from '$lib/components/docs/PatternDemo.svelte';

	const shortcuts = [
		{ keys: ['Tab'], desc: 'Restart / Back to home' },
		{ keys: ['Space'], desc: 'Flag / Chord' },
		{ keys: ['Enter'], desc: 'Reveal a cell' },
		{ keys: [':'], desc: 'Open palette' }
	];

	const motions = [
		{ keys: ['h', 'j', 'k', 'l'], desc: 'Move Left / Down / Up / Right' },
		{ keys: ['w', 'b'], desc: 'Jump forward / backward by word' },
		{ keys: ['gg', 'G'], desc: 'Jump to Top / Bottom of grid' },
		{ keys: ['/'], desc: 'Search for a number (e.g. /7)' },
		{ keys: ['n', 'N'], desc: 'Next / Previous search match' }
	];
</script>

<svelte:head>
	<title>Zsweep Manual</title>
</svelte:head>

<div class="min-h-screen bg-bg font-mono text-text selection:bg-main/30">
	<div class="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-12 p-8 lg:grid-cols-[220px_1fr]">
		<aside class="hidden lg:block">
			<div class="sticky top-8 space-y-8 border-l border-main/20 pl-6">
				<div class="space-y-2">
					<h3 class="text-xs font-bold uppercase tracking-widest text-sub">Game</h3>
					<ul class="space-y-2 text-sm">
						<li><a href="#shortcuts" class="hover:text-main">Key Bindings</a></li>
					</ul>
				</div>
				<div class="space-y-2">
					<h3 class="text-xs font-bold uppercase tracking-widest text-sub">Strategy</h3>
					<ul class="space-y-2 text-sm">
						<li>
							<a href="#patterns" class="hover:text-main">Mine Patterns</a>
						</li>
					</ul>
				</div>
				<div class="space-y-2">
					<h3 class="text-xs font-bold uppercase tracking-widest text-sub">Controls</h3>
					<ul class="space-y-2 text-sm">
						<li><a href="#vim" class="hover:text-main">Vim Motions</a></li>
					</ul>
				</div>
			</div>
		</aside>

		<main class="max-w-4xl space-y-24">
			<header>
				<h1
					class="mb-4 text-4xl font-black tracking-tighter
                    text-main"
				>
					Help
				</h1>
				<p class="text-lg text-sub">
					zsweep :help pages, reference guide for controls and strategies.
				</p>
			</header>

			<section id="shortcuts" class="scroll-mt-20">
				<div class="mb-6 flex items-center gap-3 border-b border-main/10 pb-2">
					<Gamepad2 class="text-main" />
					<h2 class="text-2xl font-bold">Key Bindings</h2>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					{#each shortcuts as item}
						<div class="flex items-center justify-between rounded bg-sub/5 px-4 py-3">
							<span class="text-sm text-sub">{item.desc}</span>
							<div class="flex gap-1">
								{#each item.keys as key}
									<kbd
										class="min-w-[24px] rounded bg-sub/20 px-2 py-0.5 text-center font-bold text-white shadow-sm"
										>{key}</kbd
									>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</section>

			<section id="patterns" class="scroll-mt-20">
				<div class="mb-6 flex items-center gap-3 border-b border-main/10 pb-2">
					<Hash class="text-main" />
					<h2 class="text-2xl font-bold">Mine Patterns</h2>
				</div>

				<div class="grid gap-8">
					<PatternDemo
						pattern="1-2-1"
						title="The 1-2-1 Pattern"
						desc="When you see a 1-2-1 sequence against a straight wall, the cells touching the 1s are always mines."
					/>

					<PatternDemo
						pattern="1-2-2-1"
						title="The 1-2-2-1 Pattern"
						desc="A 1-2-2-1 sequence indicates that the two mines are located between the 2s."
					/>

					<PatternDemo
						pattern="wall-3"
						title="The Wall of 3s"
						desc="If a 3 is touching exactly 3 hidden squares (flagged or not), all of them must be mines."
					/>
				</div>
			</section>

			<section id="vim" class="scroll-mt-20">
				<div class="mb-6 flex items-center gap-3 border-b border-main/10 pb-2">
					<Keyboard class="text-main" />
					<h2 class="text-2xl font-bold">Vim Motions</h2>
				</div>

				<p class="mb-6 text-sm text-sub">
					Use these keys to navigate the grid efficiently without a mouse.
				</p>

				<div class="grid gap-4 sm:grid-cols-2">
					{#each motions as item}
						<div class="flex items-center justify-between rounded bg-sub/5 px-4 py-3">
							<span class="text-sm text-sub">{item.desc}</span>
							<div class="flex gap-1">
								{#each item.keys as key}
									<kbd
										class="min-w-[24px] rounded bg-sub/20 px-2 py-0.5 text-center font-bold text-main shadow-sm"
										>{key}</kbd
									>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</section>
		</main>
	</div>
</div>
