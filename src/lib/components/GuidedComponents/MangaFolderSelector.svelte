<script lang="ts">
	import type { GuidedState } from './GuidedState.svelte';

	interface Props {
		guidedState: GuidedState;
		class?: string;
		onDone: () => void;
	}

	let { guidedState, class: className = '', onDone }: Props = $props();

	function toggleZipSelection(zipFile: File) {
		const index = guidedState.selectedZipFiles.indexOf(zipFile);
		if (index >= 0) {
			guidedState.selectedZipFiles = guidedState.selectedZipFiles.filter((f) => f !== zipFile);
		} else {
			guidedState.selectedZipFiles = [...guidedState.selectedZipFiles, zipFile];
		}
	}

	function toggleMangaFolder(mangaFolderName: string) {
		const zipsInFolder = Array.from(guidedState.zipFilesByMangaFolder.get(mangaFolderName) ?? []);
		const allSelected = zipsInFolder.every((zipInfo) =>
			guidedState.selectedZipFiles.includes(zipInfo.file)
		);

		if (allSelected) {
			// Deselect all zips in this folder
			guidedState.selectedZipFiles = guidedState.selectedZipFiles.filter(
				(file) => !zipsInFolder.some((zipInfo) => zipInfo.file === file)
			);
		} else {
			// Select all zips in this folder
			const newSelections = zipsInFolder
				.map((zipInfo) => zipInfo.file)
				.filter((file) => !guidedState.selectedZipFiles.includes(file));
			guidedState.selectedZipFiles = [...guidedState.selectedZipFiles, ...newSelections];
		}
	}

	function toggleAll() {
		if (guidedState.selectedZipFiles.length === guidedState.zipFiles.length) {
			// Deselect all
			guidedState.selectedZipFiles = [];
		} else {
			// Select all
			guidedState.selectedZipFiles = guidedState.zipFiles.map((z) => z.file);
		}
	}

	const allSelected = $derived(
		guidedState.zipFiles.length > 0 &&
			guidedState.selectedZipFiles.length === guidedState.zipFiles.length
	);

	const zipFilesByFolder = $derived(guidedState.zipFilesByMangaFolder);
</script>

<div class="flex flex-col gap-4 {className}">
	<div class="flex flex-row justify-between items-center">
		<h2 class="text-xl font-bold text-app">Select Zip Files to Process</h2>
		<button type="button" class="btn-base btn-neutral px-4 py-2" onclick={toggleAll}>
			{allSelected ? 'Deselect All' : 'Select All'}
		</button>
	</div>

	<p class="text-sm text-muted">
		{guidedState.selectedZipFiles.length} of {guidedState.zipFiles.length} zip file{guidedState
			.zipFiles.length === 1
			? ''
			: 's'} selected
	</p>

	<div class="flex flex-col gap-4 max-h-150 overflow-y-auto">
		{#each Array.from(zipFilesByFolder.entries()) as [mangaFolderName, zipInfos]}
			<div class="flex flex-col gap-2">
				<div class="flex flex-row justify-between items-center">
					<h3 class="text-lg font-semibold text-app">{mangaFolderName}</h3>
					<button
						type="button"
						class="btn-base btn-neutral px-3 py-1 text-sm"
						onclick={() => toggleMangaFolder(mangaFolderName)}
					>
						{zipInfos.every((zipInfo) => guidedState.selectedZipFiles.includes(zipInfo.file))
							? 'Deselect All'
							: 'Select All'} ({zipInfos.length})
					</button>
				</div>
				<div class="flex flex-col gap-2 ml-4">
					{#each zipInfos as zipInfo}
						{@const isSelected = guidedState.selectedZipFiles.includes(zipInfo.file)}
						<button
							type="button"
							class="flex flex-row gap-2 justify-between items-center b-1 border-surface cursor-pointer hover:bg-surface-hover rounded-md p-3 {isSelected
								? 'bg-surface-hover'
								: ''}"
							onclick={() => toggleZipSelection(zipInfo.file)}
						>
							<div class="flex flex-col gap-1 flex-1 text-left">
								<p class="text-sm font-bold text-app">{zipInfo.file.name}</p>
								<p class="text-xs text-muted">
									Size: {(zipInfo.file.size / (1024 * 1024)).toFixed(2)} MB
								</p>
							</div>
							<input
								type="checkbox"
								checked={isSelected}
								class="w-5 h-5 text-green-600 dark:text-green-400 rounded focus:ring-green-500 pointer-events-none"
							/>
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<button
		type="button"
		class="btn-primary w-full px-6 py-3 font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
		disabled={guidedState.selectedZipFiles.length === 0}
		onclick={onDone}
	>
		Continue to Processing ({guidedState.selectedZipFiles.length} selected)
	</button>
</div>
