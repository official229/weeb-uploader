<script lang="ts">
	import type { SelectedFolder } from '$lib/core/GroupedFolders';
	import ImagePreviewGrid from './ImagePreviewGrid.svelte';

	interface GroupedData {
		name: string;
		nameFolder: SelectedFolder;
		files: Array<{ file: SelectedFolder['files'][0]; folder: SelectedFolder }>;
	}

	interface Props {
		groups: GroupedData[];
		progress?: Map<string, number> | Record<string, number>;
		onRemoveFolder?: (groupName: string, event: Event) => void;
		onRemoveFile?: (groupName: string, fileIndex: number, event: Event) => void;
	}

	let { groups, progress, onRemoveFolder, onRemoveFile }: Props = $props();

	function getProgress(groupName: string): number | undefined {
		if (!progress) return undefined;
		if (progress instanceof Map) {
			return progress.get(groupName);
		}
		return progress[groupName];
	}

	// Track expanded state, renamed folders, and currently editing folder
	let expandedFolders = $state<Set<string>>(new Set());
	let renamedFolders = $state<Map<string, string>>(new Map());
	let editingFolder = $state<string | null>(null);

	function toggleFolder(groupName: string, event?: Event) {
		if (event) {
			event.stopPropagation();
		}
		const newSet = new Set(expandedFolders);
		if (newSet.has(groupName)) {
			newSet.delete(groupName);
		} else {
			newSet.add(groupName);
		}
		expandedFolders = newSet;
	}

	function getFolderName(groupName: string): string {
		return renamedFolders.get(groupName) ?? groupName;
	}

	function startRenaming(groupName: string) {
		editingFolder = groupName;
	}

	function updateFolderName(groupName: string, newName: string) {
		editingFolder = null;
		if (newName.trim()) {
			renamedFolders.set(groupName, newName.trim());
		} else {
			renamedFolders.delete(groupName);
		}
		renamedFolders = new Map(renamedFolders);
	}

	function cancelRenaming(groupName: string) {
		editingFolder = null;
	}

	function autofocus(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	function handleRemoveFile(groupName: string, fileIndex: number, event: Event) {
		onRemoveFile?.(groupName, fileIndex, event);
	}
</script>

<div class="space-y-4">
	{#each groups as group}
		{@const isExpanded = expandedFolders.has(group.name)}
		{@const displayName = getFolderName(group.name)}
		{@const isRenaming = editingFolder === group.name}
		{@const folderProgress = getProgress(group.name)}
		
		<div class="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
			<!-- Folder Header -->
			<div 
				class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
				onclick={() => toggleFolder(group.name)}
				role="button"
				tabindex="0"
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						toggleFolder(group.name);
					}
				}}
			>
				<button
					type="button"
					onclick={(e) => toggleFolder(group.name, e)}
					class="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
				>
					{#if isExpanded}
						<span class="i-mdi-chevron-down text-xl"></span>
					{:else}
						<span class="i-mdi-chevron-right text-xl"></span>
					{/if}
				</button>
				
				<span class="i-mdi-folder text-blue-500 dark:text-blue-400 text-xl"></span>
				
				{#if isRenaming}
					<input
						type="text"
						value={displayName}
						onblur={(e) => updateFolderName(group.name, e.currentTarget.value)}
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								e.currentTarget.blur();
							} else if (e.key === 'Escape') {
								cancelRenaming(group.name);
								e.currentTarget.blur();
							}
						}}
						use:autofocus
						class="flex-1 px-2 py-1 border border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				{:else}
					<h3 class="flex-1 font-semibold text-gray-900 dark:text-gray-100">
						{displayName}
					</h3>
				{/if}
				
				{#if !isRenaming}
					<button
						type="button"
						onclick={(e) => {
							e.stopPropagation();
							startRenaming(group.name);
						}}
						class="flex-shrink-0 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors flex items-center gap-1.5"
						title="Rename folder"
					>
						<span class="i-mdi-pencil text-base"></span>
						<span>Rename</span>
					</button>
					{#if onRemoveFolder}
						<button
							type="button"
							onclick={(e) => onRemoveFolder?.(group.name, e)}
							class="flex-shrink-0 px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors flex items-center gap-1.5"
							title="Remove folder"
						>
							<span class="i-mdi-delete text-base"></span>
							<span>Remove</span>
						</button>
					{/if}
				{/if}
				
				<span class="text-sm text-gray-600 dark:text-gray-400">
					{group.files.length} file{group.files.length !== 1 ? 's' : ''}
				</span>
				{#if folderProgress !== undefined}
					<div class="flex items-center gap-2 min-w-[100px]">
						<div class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
							<div 
								class="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
								style="width: {folderProgress}%"
							></div>
						</div>
						<span class="text-xs text-gray-600 dark:text-gray-400 font-medium tabular-nums">
							{Math.round(folderProgress)}%
						</span>
					</div>
				{/if}
			</div>

			<!-- Expanded Content with Image Previews -->
			{#if isExpanded}
				<ImagePreviewGrid 
					files={group.files} 
					onRemove={onRemoveFile ? (fileIndex, event) => handleRemoveFile(group.name, fileIndex, event) : undefined}
				/>
			{/if}
		</div>
	{/each}
</div>

