<script lang="ts">
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';
  
  export let win: boolean = false;
  export let time: number = 0;
  export let mines: number = 0;
  export let totalClicks: number = 0;
  export let history: number[];
  export let accuracy: number = 0;
  export let sizeLabel: string = "";

  let chartCanvas: HTMLCanvasElement;
  let chartInstance: any;

  // Stats Logic
  const safeTime = time === 0 ? 1 : time;
  const mpm = Math.round(mines / (safeTime / 60));
  
  let consistency = 0;
  if (history && history.length > 0) {
      const mean = history.reduce((a, b) => a + b, 0) / history.length;
      const variance = history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / history.length;
      consistency = Math.max(0, Math.round(100 - (Math.sqrt(variance) * 10)));
  }

  onMount(() => {
    if (!chartCanvas) return;
    if (chartInstance) chartInstance.destroy();

    const chartLabels = history.length > 0 ? Array.from({ length: history.length }, (_, i) => i + 1) : [1];
    const chartData = history.length > 0 ? history : [0];

    try {
        chartInstance = new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Clicks',
                    data: chartData,
                    borderColor: '#d8b4fe',
                    backgroundColor: 'rgba(216, 180, 254, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: { display: false } // Hide Y-axis labels for cleaner look like Monkeytype
                },
                layout: { padding: 10 }
            }
        });
    } catch (e) {
        console.error("Chart error:", e);
    }
  });
</script>

<div class="flex flex-col items-center justify-center w-full min-h-[60vh] animate-in fade-in zoom-in duration-300 gap-12">
    
    <div class="grid grid-cols-[auto_1fr] gap-16 w-full max-w-6xl items-center">
        
        <div class="flex flex-col gap-6 min-w-[150px]">
            <div>
                <span class="text-3xl text-sub font-bold block leading-none mb-2">mpm</span>
                <span class="text-[80px] leading-[0.8] text-main font-bold block">{mpm}</span>
            </div>
            <div>
                <span class="text-3xl text-sub font-bold block leading-none mb-2">acc</span>
                <span class="text-[80px] leading-[0.8] text-main font-bold block">{accuracy}%</span>
            </div>
        </div>
        
        <div class="h-[250px] w-full relative">
            <canvas bind:this={chartCanvas}></canvas>
        </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-5 w-full max-w-6xl gap-4 text-center md:text-left">
        
        <div class="flex flex-col">
            <span class="text-sub text-xs font-bold mb-1 opacity-50">test type</span>
            <span class="text-text font-bold leading-tight">minesweeper</span>
            <span class="text-main text-sm leading-tight">{sizeLabel}</span>
            <span class="text-sub text-xs leading-tight mt-1">{win ? 'completed' : 'failed'}</span>
        </div>

        <div class="flex flex-col">
            <span class="text-sub text-xs font-bold mb-1 opacity-50">mines</span>
            <span class="text-[32px] text-text font-bold leading-none">{mines}</span>
        </div>

        <div class="flex flex-col">
            <span class="text-sub text-xs font-bold mb-1 opacity-50">clicks</span>
            <span class="text-[32px] text-text font-bold leading-none">{totalClicks}</span>
        </div>

        <div class="flex flex-col">
            <span class="text-sub text-xs font-bold mb-1 opacity-50">consistency</span>
            <span class="text-[32px] text-text font-bold leading-none">{consistency}%</span>
        </div>

        <div class="flex flex-col">
            <span class="text-sub text-xs font-bold mb-1 opacity-50">time</span>
            <span class="text-[32px] text-text font-bold leading-none">{time}s</span>
        </div>

    </div>

    <div class="mt-12 opacity-40 text-xs font-mono flex gap-8">
        <div class="flex items-center gap-2">
            <kbd class="bg-sub/20 px-1.5 py-0.5 rounded text-text">tab</kbd>
            <span>- restart test</span>
        </div>
    </div>

</div>
