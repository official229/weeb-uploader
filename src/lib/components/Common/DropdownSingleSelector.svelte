<script lang="ts">
	interface Props {
		items: string[];
		selectedItem: string | null;
		class?: string;
	}

	let {
		items,
		selectedItem = $bindable<string | null>(null),
		class: className = ''
	}: Props = $props();
</script>

<select
	bind:value={selectedItem}
	class={['b-1 border-gray-300 rounded-md py-1 px-2 inline-block', className]}
>
	{#each items as item}
		<option value={item}>{item}</option>
	{/each}
</select>
