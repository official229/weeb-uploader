<script lang="ts">
	interface Props {
		items: string[];
		selectedItem: string | null;
		class?: string;
		id?: string;
		getDisplayText?: (item: string) => string;
	}

	let {
		items,
		selectedItem = $bindable<string | null>(null),
		class: className = '',
		id,
		getDisplayText
	}: Props = $props();

	function getItemDisplayText(item: string): string {
		return getDisplayText ? getDisplayText(item) : item;
	}
</script>

<select
	bind:value={selectedItem}
	{id}
	class={[
		'b-1 border-gray-300 bg-gray-100 hover:bg-gray-200 cursor-pointer rounded-md py-1 px-2 inline-block',
		className
	]}
>
	{#each items as item}
		<option value={item}>{getItemDisplayText(item)}</option>
	{/each}
</select>
