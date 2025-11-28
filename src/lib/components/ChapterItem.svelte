<script lang="ts">
	import type { ChapterState } from '$lib/core/UploadingState.svelte';
	import type { ScanGroup } from '$lib/core/UploadingState.svelte';
	import ImagePreviewGrid from './ImagePreviewGrid.svelte';
	import GroupDropdown from './GroupDropdown.svelte';
	import { SelectedFile } from '$lib/core/GroupedFolders';
	import type { SelectedFolder } from '$lib/core/GroupedFolders';

	interface Props {
		chapter: ChapterState;
		chapterIndex: number;
		chapterKey: string;
		rootFolder?: SelectedFolder;
		availableGroups: ScanGroup[];
		isExpanded: boolean;
		isManuallyEdited: boolean;
		isEditingTitle: boolean;
		isEditingVolume: boolean;
		isEditingNumber: boolean;
		onToggle: () => void;
		onStartEditing: (field: 'title' | 'volume' | 'number') => void;
		onUpdateField: (field: 'title' | 'volume' | 'number', value: string | number | null) => void;
		onCancelEditing: () => void;
		onRevert: () => void;
		onRemove: () => void;
		onRemovePage: (pageIndex: number, event: Event) => void;
		onToggleGroup: (groupId: string) => void;
		onClearGroups: () => void;
		getFolderName: (chapter: ChapterState) => string;
		getGroupName: (groupId: string) => string;
	}

	let {
		chapter,
		chapterIndex,
		chapterKey,
		rootFolder,
		availableGroups,
		isExpanded,
		isManuallyEdited,
		isEditingTitle,
		isEditingVolume,
		isEditingNumber,
		onToggle,
		onStartEditing,
		onUpdateField,
		onCancelEditing,
		onRevert,
		onRemove,
		onRemovePage,
		onToggleGroup,
		onClearGroups,
		getFolderName,
		getGroupName
	}: Props = $props();

	let groupDropdownOpen = $state(false);
	let groupButtonRef = $state<HTMLButtonElement | null>(null);

	const chapterGroupIds = $derived(chapter.associatedGroup?.groupIds ?? []);

	function autofocus(node: HTMLInputElement) {
		node.focus();
		node.select();
	}
</script>

<div class="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
	<!-- Chapter Header -->
	<div
		class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
		onclick={onToggle}
		role="button"
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				onToggle();
			}
		}}
	>
		<button
			type="button"
			onclick={(e) => {
				e.stopPropagation();
				onToggle();
			}}
			class="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
		>
			{#if isExpanded}
				<span class="i-mdi-chevron-down text-xl"></span>
			{:else}
				<span class="i-mdi-chevron-right text-xl"></span>
			{/if}
		</button>

		<span class="i-mdi-folder text-blue-500 dark:text-blue-400 text-xl"></span>

		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2 flex-wrap">
				<!-- Title -->
				<div class="flex items-center gap-1">
					<span class="text-sm text-gray-500 dark:text-gray-400">Title:</span>
					{#if isEditingTitle}
						<input
							type="text"
							value={chapter.chapterTitle ?? ''}
							onblur={(e) => onUpdateField('title', e.currentTarget.value)}
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.currentTarget.blur();
								} else if (e.key === 'Escape') {
									onCancelEditing();
									e.currentTarget.blur();
								}
							}}
							use:autofocus
							onclick={(e) => e.stopPropagation()}
							class="px-2 py-1 border border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
						/>
					{:else}
						<span
							class="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
							onclick={(e) => {
								e.stopPropagation();
								onStartEditing('title');
							}}
						>
							{chapter.chapterTitle ?? 'Untitled'}
						</span>
					{/if}
				</div>

				<!-- Volume -->
				<div class="flex items-center gap-1">
					<span class="text-sm text-gray-500 dark:text-gray-400">Vol:</span>
					{#if isEditingVolume}
						<input
							type="number"
							value={chapter.chapterVolume ?? ''}
							onblur={(e) => onUpdateField('volume', e.currentTarget.value)}
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.currentTarget.blur();
								} else if (e.key === 'Escape') {
									onCancelEditing();
									e.currentTarget.blur();
								}
							}}
							use:autofocus
							onclick={(e) => e.stopPropagation()}
							class="px-2 py-1 border border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-20"
						/>
					{:else}
						<span
							class="text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
							onclick={(e) => {
								e.stopPropagation();
								onStartEditing('volume');
							}}
						>
							{chapter.chapterVolume ?? '—'}
						</span>
					{/if}
				</div>

				<!-- Number -->
				<div class="flex items-center gap-1">
					<span class="text-sm text-gray-500 dark:text-gray-400">Ch:</span>
					{#if isEditingNumber}
						<input
							type="number"
							value={chapter.chapterNumber ?? ''}
							onblur={(e) => onUpdateField('number', e.currentTarget.value)}
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.currentTarget.blur();
								} else if (e.key === 'Escape') {
									onCancelEditing();
									e.currentTarget.blur();
								}
							}}
							use:autofocus
							onclick={(e) => e.stopPropagation()}
							class="px-2 py-1 border border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-20"
						/>
					{:else}
						<span
							class="text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
							onclick={(e) => {
								e.stopPropagation();
								onStartEditing('number');
							}}
						>
							{chapter.chapterNumber ?? '—'}
						</span>
					{/if}
				</div>

				{#if isManuallyEdited}
					<span
						class="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded"
					>
						Manually Edited
					</span>
				{/if}

				<!-- Groups -->
				<div class="relative flex items-center gap-1" onclick={(e) => e.stopPropagation()}>
					<span class="text-sm text-gray-500 dark:text-gray-400">Groups:</span>
					<div class="relative group-dropdown-container">
						<button
							type="button"
							bind:this={groupButtonRef}
							onclick={(e) => {
								e.stopPropagation();
								groupDropdownOpen = !groupDropdownOpen;
							}}
							class="flex items-center gap-1.5 px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
						>
							{#if chapterGroupIds.length > 0}
								<div class="flex items-center gap-1 flex-wrap max-w-[200px]">
									{#each chapterGroupIds.slice(0, 2) as groupId}
										<span
											class="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded"
										>
											{getGroupName(groupId)}
										</span>
									{/each}
									{#if chapterGroupIds.length > 2}
										<span class="text-xs text-gray-500 dark:text-gray-400">
											+{chapterGroupIds.length - 2}
										</span>
									{/if}
								</div>
							{:else}
								<span class="text-xs text-gray-400 italic">No groups</span>
							{/if}
							<span
								class="i-mdi-chevron-{groupDropdownOpen
									? 'up'
									: 'down'} text-xs text-gray-500 dark:text-gray-400"
							></span>
						</button>
					</div>
				</div>
			</div>
			<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
				Original: {getFolderName(chapter)} • {chapter.pages.length} page{chapter.pages.length !== 1
					? 's'
					: ''}
			</div>
		</div>

		{#if isManuallyEdited}
			<button
				type="button"
				onclick={(e) => {
					e.stopPropagation();
					onRevert();
				}}
				class="flex-shrink-0 px-3 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors flex items-center gap-1.5"
				title="Revert to default"
			>
				<span class="i-mdi-undo text-base"></span>
				<span>Revert</span>
			</button>
		{/if}

		<button
			type="button"
			onclick={(e) => {
				e.stopPropagation();
				onRemove();
			}}
			class="flex-shrink-0 px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors flex items-center gap-1.5"
			title="Remove chapter"
		>
			<span class="i-mdi-delete text-base"></span>
			<span>Remove</span>
		</button>
	</div>

	<!-- Expanded Content with Image Previews -->
	{#if isExpanded}
		<ImagePreviewGrid
			files={chapter.pages.map((page) => ({
				file: new SelectedFile(page.pageFile, page.pageFile.name),
				folder: {} as SelectedFolder
			}))}
			onRemove={(fileIndex, event) => onRemovePage(fileIndex, event)}
		/>
	{/if}
</div>

<!-- Group Dropdown -->
<GroupDropdown
	{availableGroups}
	selectedGroupIds={chapterGroupIds}
	onToggle={onToggleGroup}
	onClear={onClearGroups}
	buttonRef={groupButtonRef}
	isOpen={groupDropdownOpen}
	onOpenChange={(open) => {
		groupDropdownOpen = open;
	}}
/>

