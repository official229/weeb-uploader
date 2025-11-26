<script lang="ts">
	import type { SelectedFolder } from '$lib/core/GroupedFolders';

	interface GroupedData {
		name: string;
		nameFolder: SelectedFolder;
		files: Array<{ file: SelectedFolder['files'][0]; folder: SelectedFolder }>;
	}

	interface Props {
		groups: GroupedData[];
	}

	let { groups: initialGroups }: Props = $props();

	// Create a mutable copy of groups
	let groups = $state<GroupedData[]>([...initialGroups]);

	// Track expanded state, renamed folders, and currently editing folder
	let expandedFolders = $state<Set<string>>(new Set());
	let renamedFolders = $state<Map<string, string>>(new Map());
	let editingFolder = $state<string | null>(null);

	// Sync groups when initialGroups changes
	$effect(() => {
		groups = [...initialGroups];
	});

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

	function removeFolder(groupName: string, event: Event) {
		event.stopPropagation();
		groups = groups.filter(g => g.name !== groupName);
		// Clean up state for removed folder
		expandedFolders.delete(groupName);
		renamedFolders.delete(groupName);
		if (editingFolder === groupName) {
			editingFolder = null;
		}
		expandedFolders = new Set(expandedFolders);
		renamedFolders = new Map(renamedFolders);
	}

	function removeFile(groupName: string, fileIndex: number, event: Event) {
		event.stopPropagation();
		const groupIndex = groups.findIndex(g => g.name === groupName);
		if (groupIndex !== -1) {
			const newGroups = [...groups];
			newGroups[groupIndex] = {
				...newGroups[groupIndex],
				files: newGroups[groupIndex].files.filter((_, i) => i !== fileIndex)
			};
			// Remove folder if no files remain
			if (newGroups[groupIndex].files.length === 0) {
				groups = newGroups.filter((_, i) => i !== groupIndex);
				expandedFolders.delete(groupName);
				renamedFolders.delete(groupName);
				expandedFolders = new Set(expandedFolders);
				renamedFolders = new Map(renamedFolders);
			} else {
				groups = newGroups;
			}
		}
	}

	function createImagePreviewUrl(file: File): string {
		return URL.createObjectURL(file);
	}

	// Cleanup object URLs when component is destroyed
	$effect(() => {
		return () => {
			// Cleanup will happen when component is destroyed
		};
	});
</script>

<div class="space-y-4">
	{#each groups as group}
		{@const isExpanded = expandedFolders.has(group.name)}
		{@const displayName = getFolderName(group.name)}
		{@const isRenaming = editingFolder === group.name}
		
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
					<button
						type="button"
						onclick={(e) => removeFolder(group.name, e)}
						class="flex-shrink-0 px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors flex items-center gap-1.5"
						title="Remove folder"
					>
						<span class="i-mdi-delete text-base"></span>
						<span>Remove</span>
					</button>
				{/if}
				
				<span class="text-sm text-gray-600 dark:text-gray-400">
					{group.files.length} file{group.files.length !== 1 ? 's' : ''}
				</span>
			</div>

			<!-- Expanded Content with Image Previews -->
			{#if isExpanded}
				<div class="p-4 bg-white dark:bg-gray-900">
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
						{#each group.files as { file, folder }, fileIndex}
							{@const previewUrl = createImagePreviewUrl(file.file)}
							<div class="relative group">
								<div class="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
									<img
										src={previewUrl}
										alt={file.file.name}
										class="w-full h-full object-cover"
										loading="lazy"
									/>
									<!-- Remove file button overlay -->
									<button
										type="button"
										onclick={(e) => removeFile(group.name, fileIndex, e)}
										class="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
										title="Remove file"
									>
										<span class="i-mdi-close text-sm"></span>
									</button>
								</div>
								<div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
									<span class="text-white text-xs text-center px-2 line-clamp-2">
										{file.file.name}
									</span>
								</div>
								<div class="mt-1 text-xs text-gray-600 dark:text-gray-400 truncate" title={file.file.name}>
									{file.file.name}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/each}
</div>

