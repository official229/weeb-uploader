<script lang="ts">
	import FolderPicker from '$lib/components/FolderPicker.svelte';
	import FolderView from '$lib/components/FolderView.svelte';
	import VerticalSliceSelector from '$lib/components/VerticalSliceSelector.svelte';
	import Uploader from '$lib/components/Uploader.svelte';
	import { groupFilesByFolders, filterImageFiles, SelectedFolder } from '$lib/core/GroupedFolders';
	filterValidFiles;
	type GroupedData = Array<{
		name: string;
		nameFolder: SelectedFolder;
		files: Array<{ file: SelectedFolder['files'][0]; folder: SelectedFolder }>;
	}>;

	let selectedFiles = $state<File[] | null>(null);
	let isLoading = $state(false);
	let imageFiles = $state<File[]>([]);
	let groupedFolder = $state<SelectedFolder>(new SelectedFolder('/', '/', [], [], 0, 0));
	let loadingMessage = $state('');
	let showUploader = $state(false);
	let uploaderGroups = $state<GroupedData>([]);

	// Process files: filter images, then group by folders
	$effect(() => {
		if (!selectedFiles) {
			imageFiles = [];
			groupedFolder = new SelectedFolder('/', '/', [], [], 0, 0);
			return;
		}

		// Step 1: Filter image files
		const filesToProcess = selectedFiles; // Capture for closure
		isLoading = true;
		loadingMessage = `Filtering image files from ${filesToProcess.length} total file${filesToProcess.length !== 1 ? 's' : ''}...`;

		const filtered = filterImageFiles(filesToProcess);
		imageFiles = filtered;

		// Step 2: Group filtered images by folders
		if (filtered.length === 0) {
			groupedFolder = new SelectedFolder('/', '/', [], [], 0, 0);
			isLoading = false;
			filterValidFiles;
			loadingMessage = '';
			return;
		}

		loadingMessage = `Grouping ${filtered.length} image file${filtered.length !== 1 ? 's' : ''} by folders...`;

		const grouped = groupFilesByFolders(filtered);
		console.log('Grouped folders:', grouped);
		groupedFolder = grouped;
		isLoading = false;
		loadingMessage = '';
	});
</script>

<div class="container mx-auto p-6 space-y-6">
	<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Batch Image Uploader</h1>

	<FolderPicker bind:files={selectedFiles} />

	{#if selectedFiles && !isLoading}
		<div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
			<p class="text-sm text-gray-700 dark:text-gray-300">
				Total files selected: {selectedFiles.length} • Image files: {imageFiles.length} • Non-image files
				filtered: {selectedFiles.length - imageFiles.length}
			</p>
		</div>
	{/if}

	{#if isLoading}
		<div
			class="flex flex-col items-center justify-center p-12 bg-gray-50 dark:bg-gray-800 rounded-lg"
		>
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
			<p class="text-gray-700 dark:text-gray-300 font-medium">{loadingMessage}</p>
		</div>
	{:else if groupedFolder && (groupedFolder.files.length > 0 || groupedFolder.folders.length > 0)}
		{#if showUploader}
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Upload Groups</h2>
					<button
						type="button"
						onclick={() => (showUploader = false)}
						class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
					>
						Back to Selector
					</button>
				</div>
				<Uploader groups={uploaderGroups} rootFolder={groupedFolder} />
			</div>
		{:else}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<!-- Folder Tree View -->
				<div>
					<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
						Folder Structure
					</h2>
					<FolderView folder={groupedFolder} />
				</div>

				<!-- Vertical Slice Selector -->
				<div>
					<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
						Vertical Slice Selector
					</h2>
					<VerticalSliceSelector
						folder={groupedFolder}
						onProcess={(groups) => {
							uploaderGroups = groups;
							showUploader = true;
						}}
					/>
				</div>
			</div>
		{/if}
	{:else if selectedFiles && imageFiles.length === 0}
		<div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
			<p class="text-yellow-800 dark:text-yellow-200">
				No image files found in the selected folder. Please select a folder containing image files.
			</p>
		</div>
	{/if}
</div>
