<script lang="ts">
	import type { SelectedFolder } from '$lib/core/GroupedFolders';
	import { getFoldersAtDepth, getMaxDepth, findParentsAtDepth, getFolderPath } from '$lib/core/GroupedFolders';

	interface Props {
		folder: SelectedFolder;
		onProcess?: (data: Array<{ name: string; nameFolder: SelectedFolder; files: Array<{ file: SelectedFolder['files'][0]; folder: SelectedFolder }> }>) => void;
	}

	let { folder, onProcess }: Props = $props();

	// Depth selectors
	let fileDepth = $state<number>(1);
	let nameDepth = $state<number>(1);

	// File path filter (optional substring to filter files)
	let filePathFilter = $state<string>('');

	// Selected folders
	let selectedFileFolders = $state<Set<SelectedFolder>>(new Set());
	let selectedNameFolders = $state<Set<SelectedFolder>>(new Set());

	const maxDepth = $derived.by(() => getMaxDepth(folder));
	
	const foldersAtFileDepth = $derived.by(() => {
		if (fileDepth < 1) return [];
		const allFolders = getFoldersAtDepth(folder, fileDepth);
		
		// If no filter is set, return all folders
		if (!filePathFilter.trim()) {
			return allFolders;
		}
		
		// Filter folders to only include those with at least one file matching the path filter
		const filterLower = filePathFilter.toLowerCase();
		return allFolders.filter(folderAtDepth => {
			return folderAtDepth.files.some(file => 
				file.path.toLowerCase().includes(filterLower)
			);
		});
	});

	const foldersAtNameDepth = $derived.by(() => {
		if (nameDepth < 1) return [];
		return getFoldersAtDepth(folder, nameDepth);
	});

	// Remove selected file folders that no longer match the filter
	$effect(() => {
		// Access foldersAtFileDepth to track changes
		const availableFolders = foldersAtFileDepth;
		
		// Remove any selected folders that are no longer in the filtered list
		const filtered = new Set<SelectedFolder>();
		for (const selectedFolder of selectedFileFolders) {
			if (availableFolders.includes(selectedFolder)) {
				filtered.add(selectedFolder);
			}
		}
		
		if (filtered.size !== selectedFileFolders.size) {
			selectedFileFolders = filtered;
		}
	});

	function toggleFileFolderSelection(folderToToggle: SelectedFolder) {
		if (selectedFileFolders.has(folderToToggle)) {
			selectedFileFolders.delete(folderToToggle);
		} else {
			selectedFileFolders.add(folderToToggle);
		}
		selectedFileFolders = new Set(selectedFileFolders);
	}

	function toggleNameFolderSelection(folderToToggle: SelectedFolder) {
		if (selectedNameFolders.has(folderToToggle)) {
			selectedNameFolders.delete(folderToToggle);
		} else {
			selectedNameFolders.add(folderToToggle);
		}
		selectedNameFolders = new Set(selectedNameFolders);
	}

	function selectAllFileFolders() {
		selectedFileFolders = new Set(foldersAtFileDepth);
	}

	function deselectAllFileFolders() {
		selectedFileFolders = new Set();
	}

	function selectAllNameFolders() {
		selectedNameFolders = new Set(foldersAtNameDepth);
	}

	function deselectAllNameFolders() {
		selectedNameFolders = new Set();
	}

	const totalSelectedFiles = $derived.by(() => {
		let count = 0;
		for (const selectedFolder of selectedFileFolders) {
			count += selectedFolder.files.length;
		}
		return count;
	});

	// Group files by their name folder
	// Recalculates when fileDepth, nameDepth, selectedFileFolders, or selectedNameFolders change
	const groupedByName = $derived.by(() => {
		const groups = new Map<SelectedFolder, Array<{ file: SelectedFolder['files'][0]; folder: SelectedFolder }>>();
		
		const fileFoldersArray = Array.from(selectedFileFolders);
		const parentMap = findParentsAtDepth(folder, fileFoldersArray, nameDepth);
		
		for (const fileFolder of selectedFileFolders) {
			const nameFolder = parentMap.get(fileFolder);
			if (nameFolder && selectedNameFolders.has(nameFolder)) {
				if (!groups.has(nameFolder)) {
					groups.set(nameFolder, []);
				}
				for (const file of fileFolder.files) {
					groups.get(nameFolder)!.push({ file, folder: fileFolder });
				}
			}
		}
		
		// Filter out empty groups
		return Array.from(groups.entries())
			.filter(([_, files]) => files.length > 0)
			.map(([nameFolder, files]) => ({
				name: nameFolder.folder,
				nameFolder,
				files
			}));
	});
</script>

<div class="space-y-6">
	<!-- Depth Selectors -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">


		<!-- Name Depth Selector -->
		<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
			<label for="name-depth-select" class="block font-medium text-gray-900 dark:text-gray-100 mb-2">
				Name Depth (grouping name)
			</label>
			<select
				id="name-depth-select"
				bind:value={nameDepth}
				class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
			>
				{#each Array.from({ length: maxDepth }, (_, i) => i + 1) as depth}
					<option value={depth}>Level {depth}</option>
				{/each}
			</select>
			<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
				{foldersAtNameDepth.length} folder{foldersAtNameDepth.length !== 1 ? 's' : ''} at this depth
			</p>
		</div>

				<!-- File Depth Selector -->
				<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
					<label for="file-depth-select" class="block font-medium text-gray-900 dark:text-gray-100 mb-2">
						File Depth (where images are)
					</label>
					<select
						id="file-depth-select"
						bind:value={fileDepth}
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
					>
						{#each Array.from({ length: maxDepth }, (_, i) => i + 1) as depth}
							<option value={depth}>Level {depth}</option>
						{/each}
					</select>
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
						{foldersAtFileDepth.length} folder{foldersAtFileDepth.length !== 1 ? 's' : ''} at this depth
					</p>
				</div>
	</div>

	<!-- File Path Filter -->
	<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
		<label for="file-path-filter" class="block font-medium text-gray-900 dark:text-gray-100 mb-2">
			File Path Filter (optional)
		</label>
		<input
			type="text"
			id="file-path-filter"
			bind:value={filePathFilter}
			placeholder="Filter files by path substring..."
			class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
		/>
		<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
			{#if filePathFilter.trim()}
				Only showing folders containing files with "{filePathFilter}" in their path
			{:else}
				Leave empty to show all folders
			{/if}
		</p>
	</div>

	<!-- File Folder Selection -->
	<div class="space-y-4">
		<div class="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">File Folders (Level {fileDepth})</h3>
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={selectAllFileFolders}
					class="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
				>
					Select All
				</button>
				<button
					type="button"
					onclick={deselectAllFileFolders}
					class="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
				>
					Deselect All
				</button>
				<span class="text-sm text-gray-600 dark:text-gray-400">
					{selectedFileFolders.size} of {foldersAtFileDepth.length} selected
					{#if selectedFileFolders.size > 0}
						• {totalSelectedFiles} file{totalSelectedFiles !== 1 ? 's' : ''}
					{/if}
				</span>
			</div>
		</div>

		<div class="space-y-2 max-h-64 overflow-y-auto">
			{#if foldersAtFileDepth.length === 0}
				<div class="p-4 text-center text-gray-500 dark:text-gray-400">
					No folders found at depth level {fileDepth}
				</div>
			{:else}
				{#each foldersAtFileDepth as folderAtDepth}
					{@const isSelected = selectedFileFolders.has(folderAtDepth)}
					<div
						class="flex items-center gap-3 p-3 border rounded-lg transition-colors {isSelected
							? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
							: 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}"
					>
						<input
							type="checkbox"
							checked={isSelected}
							onchange={() => toggleFileFolderSelection(folderAtDepth)}
							class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
						/>
						<span class="i-mdi-folder text-blue-500 dark:text-blue-400"></span>
						<div class="flex-1">
							<div class="font-medium text-gray-900 dark:text-gray-100">
								{getFolderPath(folder, folderAtDepth) ?? folderAtDepth.folder}
							</div>
							<div class="text-sm text-gray-600 dark:text-gray-400">
								{folderAtDepth.files.length} image{folderAtDepth.files.length !== 1 ? 's' : ''}
								{#if folderAtDepth.folders.length > 0}
									• {folderAtDepth.folders.length} subfolder{folderAtDepth.folders.length !== 1 ? 's' : ''}
								{/if}
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Name Folder Selection -->
	<div class="space-y-4">
		<div class="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
				Name Folders (Level {nameDepth})
			</h3>
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={selectAllNameFolders}
					class="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
				>
					Select All
				</button>
				<button
					type="button"
					onclick={deselectAllNameFolders}
					class="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
				>
					Deselect All
				</button>
				<span class="text-sm text-gray-600 dark:text-gray-400">
					{selectedNameFolders.size} of {foldersAtNameDepth.length} selected
				</span>
			</div>
		</div>

		<div class="space-y-2 max-h-64 overflow-y-auto">
			{#if foldersAtNameDepth.length === 0}
				<div class="p-4 text-center text-gray-500 dark:text-gray-400">
					No folders found at depth level {nameDepth}
				</div>
			{:else}
				{#each foldersAtNameDepth as folderAtDepth}
					{@const isSelected = selectedNameFolders.has(folderAtDepth)}
					<div
						class="flex items-center gap-3 p-3 border rounded-lg transition-colors {isSelected
							? 'border-green-500 bg-green-50 dark:bg-green-900/20'
							: 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}"
					>
						<input
							type="checkbox"
							checked={isSelected}
							onchange={() => toggleNameFolderSelection(folderAtDepth)}
							class="w-5 h-5 text-green-600 rounded focus:ring-green-500"
						/>
						<span class="i-mdi-folder text-green-500 dark:text-green-400"></span>
						<div class="flex-1">
							<div class="font-medium text-gray-900 dark:text-gray-100">
								{getFolderPath(folder, folderAtDepth) ?? folderAtDepth.folder}
							</div>
							<div class="text-sm text-gray-600 dark:text-gray-400">
								Parent of {selectedFileFolders.size > 0 ? Array.from(selectedFileFolders).filter(f => {
									const parentMap = findParentsAtDepth(folder, [f], nameDepth);
									return parentMap.get(f) === folderAtDepth;
								}).length : 0} selected file folder{selectedFileFolders.size !== 1 ? 's' : ''}
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Grouped Files Preview -->
	{#if groupedByName.length > 0}
		<div class="mt-6 space-y-4 flex flex-col h-200">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
				Grouped Files by Name ({groupedByName.length} group{groupedByName.length !== 1 ? 's' : ''})
			</h3>
			<div class="space-y-2 flex-1 overflow-y-auto">
				{#each groupedByName as group}
					<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
						<h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">
							{getFolderPath(folder, group.nameFolder) ?? group.name} ({group.files.length} file{group.files.length !== 1 ? 's' : ''})
						</h4>
						<div class="space-y-1 max-h-48 overflow-y-auto">
							{#each group.files as { file, folder: fileFolder }}
								<div class="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded text-sm">
									<span class="i-mdi-file-image text-green-500 dark:text-green-400"></span>
									<span class="text-gray-700 dark:text-gray-300 flex-1">{file.file.name}</span>
									<span class="text-xs text-gray-500 dark:text-gray-400">
										{(file.file.size / 1024).toFixed(2)} KB
									</span>
									<span class="text-xs text-gray-500 dark:text-gray-400">
										from {getFolderPath(folder, fileFolder) ?? fileFolder.folder}
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
			<div class="pt-4 border-t border-gray-300 dark:border-gray-600">
				<button
					type="button"
					onclick={() => onProcess?.(groupedByName)}
					class="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={groupedByName.length === 0}
				>
					Process & Upload
				</button>
			</div>
		</div>
	{/if}
</div>
