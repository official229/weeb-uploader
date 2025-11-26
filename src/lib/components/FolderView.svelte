<script lang="ts">
	import type { SelectedFolder } from '$lib/core/GroupedFolders';
	import FolderView from './FolderView.svelte';

	interface Props {
		folder: SelectedFolder;
		level?: number;
	}

	let { folder, level = 0 }: Props = $props();
	let isExpanded = $state(false);

	function toggleExpanded() {
		if (hasContent) {
			isExpanded = !isExpanded;
		}
	}

	const hasContent = folder.files.length > 0 || folder.folders.length > 0;
	const indent = level * 1.5; // rem units
</script>

<div class="select-none">
	<!-- Folder Header -->
	<button
		type="button"
		class="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors w-full text-left"
		style="padding-left: {indent}rem;"
		onclick={toggleExpanded}
		disabled={!hasContent}
	>
		<!-- Expand/Collapse Icon -->
		{#if hasContent}
			<span class="w-4 h-4 flex items-center justify-center">
				{#if isExpanded}
					<span class="i-mdi-chevron-down text-gray-600 dark:text-gray-400"></span>
				{:else}
					<span class="i-mdi-chevron-right text-gray-600 dark:text-gray-400"></span>
				{/if}
			</span>
		{:else}
			<span class="w-4 h-4"></span>
		{/if}

		<!-- Folder Icon -->
		<span class="i-mdi-folder text-blue-500 dark:text-blue-400"></span>

		<!-- Folder Name -->
		<span class="font-medium text-gray-900 dark:text-gray-100">
			{folder.folder || 'Root'}
		</span>

		<!-- File/Folder Count -->
		<span class="text-sm text-gray-500 dark:text-gray-400 ml-auto">
			({folder.files.length} file{folder.files.length !== 1 ? 's' : ''}, {folder.folders.length} folder{folder.folders.length !== 1 ? 's' : ''})
		</span>
	</button>

	<!-- Expanded Content -->
	{#if isExpanded}
		<div class="ml-4" style="margin-left: {indent + 1}rem;">
			<!-- Subfolders -->
			{#each folder.folders as subfolder}
				<FolderView folder={subfolder} level={level + 1} />
			{/each}

			<!-- Files -->
			{#each folder.files as selectedFile}
				<div
					class="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded transition-colors"
					style="padding-left: {(level + 1) * 1.5}rem;"
				>
					<span class="w-4 h-4"></span>
					<span class="i-mdi-file text-gray-500 dark:text-gray-400"></span>
					<span class="text-sm text-gray-700 dark:text-gray-300">{selectedFile.file.name}</span>
					<span class="text-xs text-gray-500 dark:text-gray-500 ml-auto">
						{(selectedFile.file.size / 1024).toFixed(2)} KB
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

