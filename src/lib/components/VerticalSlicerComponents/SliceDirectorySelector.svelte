<script lang="ts">
	import type { VerticalSliceSelection } from '$lib/components/VerticalSlicerComponents/VerticalSliceTypes.svelte';

	interface Props {
		selectedSlicedFolder: VerticalSliceSelection;
	}

	let {
		selectedSlicedFolder = $bindable<VerticalSliceSelection>(
			null as unknown as VerticalSliceSelection
		)
	}: Props = $props();

	function onClick() {
		selectedSlicedFolder.isSelected = !selectedSlicedFolder.isSelected;
	}
</script>

<button
	class="flex flex-row gap-2 justify-between items-center b-1 cursor-pointer hover:bg-gray-100 rounded-md p-2"
	onclick={onClick}
>
	<div class="flex flex-col gap-2">
		<p class="text-sm text-gray-500">
			<span class="font-bold">Path:</span>
			{selectedSlicedFolder.folder.path}
		</p>
		<div class="flex flex-row gap-2">
			<p class="text-sm text-gray-500">
				<span class="font-bold">Name:</span>
				{selectedSlicedFolder.folder.name}
			</p>
			<p class="text-sm text-gray-500">
				<span class="font-bold">Files:</span>
				{selectedSlicedFolder.folder.files.length}
			</p>
		</div>
	</div>
	<input
		type="checkbox"
		bind:checked={selectedSlicedFolder.isSelected}
		class="w-5 h-5 text-green-600 rounded focus:ring-green-500"
	/>
</button>
