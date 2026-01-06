<script>
	import '../app.css';
</script>

<svelte:head>
	<link
		rel="icon"
		type="image/svg+xml"
		href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'
        width='24' height='24' viewBox='0 0 24 24' fill='none'
        stroke='%23B39DDB' stroke-width='2' stroke-linecap='round'
        stroke-linejoin='round' class='lucide lucide-bomb-icon
        lucide-bomb'%3E%3Ccircle cx='11' cy='13' r='9'/%3E%3Cpath d='M14.35 4.65
        16.3 2.7a2.41 2.41 0 0 1 3.4 0l1.6 1.6a2.4 2.4 0 0 1 0 3.4l-1.95
        1.95'/%3E%3Cpath d='m22 2-1.5 1.5'/%3E%3C/svg%3E"
	/>

	<title>Zsweep | A minimalistic, customizable minesweeper</title>

	<meta
		name="description"
		content="A modern, minimalistic minesweeper game inspired by Monkeytype."
	/>
	<meta name="theme-color" content="#323437" />

	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "WebSite",
			"name": "Zsweep",
			"url": "https://zsweep.com",
			"potentialAction": {
				"@type": "SearchAction",
				"target": "https://zsweep.com/?q={search_term_string}",
				"query-input": "required name=search_term_string"
			}
		}
	</script>
</svelte:head>

<slot />
