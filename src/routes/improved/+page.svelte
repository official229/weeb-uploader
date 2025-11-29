<script lang="ts">
	import FolderSelector from '$lib/components/FolderSelectorComponents/FolderSelector.svelte';
	import VerticalSlice from '$lib/components/VerticalSlicerComponents/VerticalSlice.svelte';

	let selectedFiles = $state<File[] | null>(null);
</script>

<div class="container mx-auto p-6 flex flex-col gap-6">
	<h1 class="text-xl font-bold">Uploader Improved</h1>

	<a href="/docs" class="text-blue-500 hover:text-blue-600">Tutorial & Docs</a>

	<FolderSelector bind:selectedFiles class="w-full max-w-md mx-auto" />

	{#if selectedFiles}
		<VerticalSlice {selectedFiles} />
	{:else}
		<p class="text-gray-500">No files selected</p>
	{/if}
</div>
