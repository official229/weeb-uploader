<script lang="ts">
	import type { GuidedState } from './GuidedState.svelte';
	import { MangaProcessingStatus } from './GuidedState.svelte';
	import DropdownSingleSelector from '../Common/DropdownSingleSelector.svelte';

	interface Props {
		guidedState: GuidedState;
		class?: string;
		onZipSelected: (zipFile: File) => void;
	}

	let { guidedState, class: className = '', onZipSelected }: Props = $props();

	function handleNextZip() {
		if (guidedState.moveToNextZip()) {
			const current = guidedState.currentZip;
			if (current) {
				onZipSelected(current.file);
			}
		}
	}

	function handleZipSelect(zipFileName: string) {
		const zipInfo = guidedState.zipFiles.find((z) => z.file.name === zipFileName);
		if (zipInfo) {
			const index = guidedState.zipFiles.findIndex((z) => z.file === zipInfo.file);
			if (index >= 0) {
				guidedState.currentZipIndex = index;
				onZipSelected(zipInfo.file);
			}
		}
	}

	const currentZipName = $derived(guidedState.currentZip?.file.name ?? null);

	const unprocessedZipNames = $derived(guidedState.unprocessedZips.map((z) => z.file.name));

	const nextZipName = $derived(guidedState.nextZip?.file.name ?? null);

	let selectedZipName = $state<string | null>(null);

	$effect(() => {
		selectedZipName = guidedState.currentZip?.file.name ?? null;
	});

	$effect(() => {
		const selected = selectedZipName;
		if (selected) {
			const current = guidedState.currentZip?.file.name ?? null;
			if (selected !== current) {
				handleZipSelect(selected);
			}
		}
	});
</script>

<div class="flex flex-col gap-4 bg-surface rounded-md p-4 {className}">
	<!-- Current Zip Section -->
	<div class="flex flex-col gap-2">
		<h3 class="text-lg font-bold text-app">Current Zip File</h3>
		{#if currentZipName}
			<div class="flex flex-row gap-2 items-center">
				<p class="text-app font-medium">{currentZipName}</p>
				<span
					class="px-2 py-1 rounded text-xs font-semibold {guidedState.currentZip?.status ===
					MangaProcessingStatus.PROCESSING
						? 'bg-blue-500 text-white'
						: guidedState.currentZip?.status === MangaProcessingStatus.COMPLETED
							? 'bg-green-500 text-white'
							: guidedState.currentZip?.status === MangaProcessingStatus.ERROR
								? 'bg-red-500 text-white'
								: 'bg-gray-500 text-white'}"
				>
					{guidedState.currentZip?.status ?? 'UNKNOWN'}
				</span>
			</div>
			{#if guidedState.currentZip}
				<p class="text-xs text-muted">
					Manga Folder: {guidedState.currentZip.mangaFolderName}
				</p>
			{/if}
		{:else}
			<p class="text-muted">No zip file selected</p>
		{/if}
	</div>

	<!-- Next Zip Button -->
	<div class="flex flex-col gap-2">
		<h3 class="text-lg font-bold text-app">Next Zip File</h3>
		{#if nextZipName}
			<button type="button" class="btn-primary px-4 py-2" onclick={handleNextZip}>
				Process: {nextZipName}
			</button>
		{:else}
			<p class="text-muted">No more zip files to process</p>
		{/if}
	</div>

	<!-- Unprocessed Zip Selector -->
	<div class="flex flex-col gap-2">
		<h3 class="text-lg font-bold text-app">Unprocessed Zip Files</h3>
		{#if unprocessedZipNames.length > 0}
			<DropdownSingleSelector
				items={unprocessedZipNames}
				bind:selectedItem={selectedZipName}
				class="w-full"
			/>
		{:else}
			<p class="text-muted">All zip files have been processed</p>
		{/if}
	</div>
</div>
