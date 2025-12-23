<script lang="ts">
	interface Props {
		rangeStart: number | null;
		rangeEnd: number | null;
		min: number;
		max: number;
	}

	let {
		rangeStart = $bindable<number | null>(null),
		rangeEnd = $bindable<number | null>(null),
		min,
		max
	}: Props = $props();

	// Ensure rangeEnd is never less than rangeStart
	$effect(() => {
		if (rangeStart !== null && rangeEnd !== null && rangeEnd < rangeStart) {
			rangeEnd = rangeStart;
		}
	});
</script>

<div class="flex flex-row gap-2 items-center text-app">
	<p>Range:</p>
	<input
		type="number"
		bind:value={rangeStart}
		placeholder="Start"
		{min}
		max={rangeEnd !== null ? Math.min(max, rangeEnd) : max}
		class="input-base grow-1 min-w-10"
	/>
	<p>to</p>
	<input
		type="number"
		bind:value={rangeEnd}
		placeholder="End"
		min={rangeStart !== null ? Math.max(min, rangeStart) : min}
		{max}
		class="input-base grow-1 min-w-10"
	/>
</div>
