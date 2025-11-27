<script lang="ts">
	import type { ChapterState, ChapterPageState } from '$lib/core/UploadingState.svelte';
	import ImagePreviewGrid from './ImagePreviewGrid.svelte';
	import { getFolderPath, SelectedFile } from '$lib/core/GroupedFolders';
	import type { SelectedFolder } from '$lib/core/GroupedFolders';

	interface Props {
		chapters: ChapterState[];
		rootFolder?: SelectedFolder;
		onRemoveChapter?: (chapterIndex: number, event: Event) => void;
		onRemovePage?: (chapterIndex: number, pageIndex: number, event: Event) => void;
		onChaptersChange?: (chapters: ChapterState[]) => void;
	}

	let { chapters, rootFolder, onRemoveChapter, onRemovePage, onChaptersChange }: Props = $props();

	// Track expanded state
	let expandedChapters = $state<Set<number>>(new Set());

	// Track manually edited chapters (by index)
	let manuallyEditedChapters = $state<Set<number>>(new Set());

	// Track editing state per chapter
	let editingChapter = $state<number | null>(null);
	let editingField = $state<'title' | 'volume' | 'number' | null>(null);

	// Batch editing regex inputs
	let titleRegex = $state<string>('');
	let volumeRegex = $state<string>('');
	let numberRegex = $state<string>('');

	function toggleChapter(chapterIndex: number) {
		const newSet = new Set(expandedChapters);
		if (newSet.has(chapterIndex)) {
			newSet.delete(chapterIndex);
		} else {
			newSet.add(chapterIndex);
		}
		expandedChapters = newSet;
	}

	function startEditing(chapterIndex: number, field: 'title' | 'volume' | 'number') {
		editingChapter = chapterIndex;
		editingField = field;
		manuallyEditedChapters.add(chapterIndex);
		manuallyEditedChapters = new Set(manuallyEditedChapters);
	}

	function updateChapterField(
		chapterIndex: number,
		field: 'title' | 'volume' | 'number',
		value: string | number | null
	) {
		const chapter = chapters[chapterIndex];
		if (!chapter) return;

		if (field === 'title') {
			chapter.chapterTitle = value as string | null;
		} else if (field === 'volume') {
			chapter.chapterVolume = value === '' || value === null ? null : Number(value);
		} else if (field === 'number') {
			chapter.chapterNumber = value === '' || value === null ? null : Number(value);
		}

		editingChapter = null;
		editingField = null;
		// Create a new array reference to trigger reactivity
		onChaptersChange?.([...chapters]);
	}

	function cancelEditing() {
		editingChapter = null;
		editingField = null;
	}

	function revertChapter(chapterIndex: number) {
		const chapter = chapters[chapterIndex];
		if (!chapter || !chapter.originalFolderName) return;

		// Revert to defaults
		chapter.chapterTitle = chapter.originalFolderName;
		chapter.chapterVolume = null;
		chapter.chapterNumber = chapterIndex + 1; // Sequential index (1-based)

		manuallyEditedChapters.delete(chapterIndex);
		manuallyEditedChapters = new Set(manuallyEditedChapters);
		// Create a new array reference to trigger reactivity
		onChaptersChange?.([...chapters]);
	}

	function extractWithRegex(text: string, regexPattern: string): string | null {
		if (!regexPattern.trim()) return null;

		try {
			const regex = new RegExp(regexPattern);
			const match = text.match(regex);
			if (match && match[1]) {
				return match[1];
			}
			return null;
		} catch (error) {
			console.error('Invalid regex pattern:', error);
			return null;
		}
	}

	function extractNumberWithRegex(text: string, regexPattern: string): number | null {
		const extracted = extractWithRegex(text, regexPattern);
		if (!extracted) return null;

		const num = Number(extracted);
		return isNaN(num) ? null : num;
	}

	function applyBatchExtraction() {
		let hasChanges = false;

		for (let i = 0; i < chapters.length; i++) {
			// Skip manually edited chapters
			if (manuallyEditedChapters.has(i)) continue;

			const chapter = chapters[i];
			if (!chapter.originalFolderName) continue;

			// Extract title
			if (titleRegex.trim()) {
				const extractedTitle = extractWithRegex(chapter.originalFolderName, titleRegex);
				if (extractedTitle !== null && chapter.chapterTitle !== extractedTitle) {
					chapter.chapterTitle = extractedTitle;
					hasChanges = true;
				}
			}

			// Extract volume
			if (volumeRegex.trim()) {
				const extractedVolume = extractNumberWithRegex(chapter.originalFolderName, volumeRegex);
				if (extractedVolume !== null && chapter.chapterVolume !== extractedVolume) {
					chapter.chapterVolume = extractedVolume;
					hasChanges = true;
				}
			}

			// Extract number
			if (numberRegex.trim()) {
				const extractedNumber = extractNumberWithRegex(chapter.originalFolderName, numberRegex);
				if (extractedNumber !== null && chapter.chapterNumber !== extractedNumber) {
					chapter.chapterNumber = extractedNumber;
					hasChanges = true;
				}
			}
		}

		if (hasChanges) {
			// Create a new array reference to trigger reactivity
			onChaptersChange?.([...chapters]);
		}
	}

	function autofocus(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	function handleRemovePage(chapterIndex: number, pageIndex: number, event: Event) {
		const chapter = chapters[chapterIndex];
		if (!chapter) return;

		const newPages = chapter.pages.filter((_, i) => i !== pageIndex);
		chapter.pages = newPages;
		chapter.checkProgress();

		// Remove chapter if no pages remain
		if (newPages.length === 0) {
			onRemoveChapter?.(chapterIndex, event);
		} else {
			onRemovePage?.(chapterIndex, pageIndex, event);
			// Create a new array reference to trigger reactivity
			onChaptersChange?.([...chapters]);
		}
	}

	function getFolderName(chapter: ChapterState): string {
		if (rootFolder && chapter.originalFolderName) {
			// Try to find the folder in the tree to get full path
			// For now, just return the original folder name
			return chapter.originalFolderName;
		}
		return chapter.originalFolderName || 'Unknown';
	}
</script>

<div class="space-y-6">
	<!-- Batch Editing Section -->
	<div
		class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600"
	>
		<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
			Batch Extract from Folder Names
		</h3>
		<div class="space-y-4">
			<!-- Title Regex -->
			<div>
				<label
					for="title-regex"
					class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
				>
					Title Regex Pattern
				</label>
				<div class="flex gap-2">
					<input
						id="title-regex"
						type="text"
						bind:value={titleRegex}
						placeholder="e.g., ^(.+?)\\s+-\\s+Vol"
						class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<button
						type="button"
						onclick={applyBatchExtraction}
						class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors font-medium"
					>
						Extract All
					</button>
				</div>
				<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
					Use capture group (parentheses) to extract the title. Skips manually edited chapters.
				</p>
			</div>

			<!-- Volume Regex -->
			<div>
				<label
					for="volume-regex"
					class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
				>
					Volume Regex Pattern
				</label>
				<div class="flex gap-2">
					<input
						id="volume-regex"
						type="text"
						bind:value={volumeRegex}
						placeholder="e.g., Vol\\.\\s*(\\d+)"
						class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<button
						type="button"
						onclick={applyBatchExtraction}
						class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors font-medium"
					>
						Extract All
					</button>
				</div>
				<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
					Use capture group to extract volume number. Skips manually edited chapters.
				</p>
			</div>

			<!-- Number Regex -->
			<div>
				<label
					for="number-regex"
					class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
				>
					Chapter Number Regex Pattern
				</label>
				<div class="flex gap-2">
					<input
						id="number-regex"
						type="text"
						bind:value={numberRegex}
						placeholder="e.g., Ch\\.\\s*(\\d+)"
						class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<button
						type="button"
						onclick={applyBatchExtraction}
						class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors font-medium"
					>
						Extract All
					</button>
				</div>
				<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
					Use capture group to extract chapter number. Skips manually edited chapters.
				</p>
			</div>
		</div>
	</div>

	<!-- Chapters List -->
	<div class="space-y-4">
		{#each chapters as chapter, chapterIndex}
			{@const isExpanded = expandedChapters.has(chapterIndex)}
			{@const isManuallyEdited = manuallyEditedChapters.has(chapterIndex)}
			{@const isEditingTitle = editingChapter === chapterIndex && editingField === 'title'}
			{@const isEditingVolume = editingChapter === chapterIndex && editingField === 'volume'}
			{@const isEditingNumber = editingChapter === chapterIndex && editingField === 'number'}

			<div class="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
				<!-- Chapter Header -->
				<div
					class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
					onclick={() => toggleChapter(chapterIndex)}
					role="button"
					tabindex="0"
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							toggleChapter(chapterIndex);
						}
					}}
				>
					<button
						type="button"
						onclick={(e) => toggleChapter(chapterIndex)}
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
										onblur={(e) => updateChapterField(chapterIndex, 'title', e.currentTarget.value)}
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												e.currentTarget.blur();
											} else if (e.key === 'Escape') {
												cancelEditing();
												e.currentTarget.blur();
											}
										}}
										use:autofocus
										class="px-2 py-1 border border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
									/>
								{:else}
									<span
										class="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
										onclick={(e) => {
											e.stopPropagation();
											startEditing(chapterIndex, 'title');
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
										onblur={(e) =>
											updateChapterField(chapterIndex, 'volume', e.currentTarget.value)}
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												e.currentTarget.blur();
											} else if (e.key === 'Escape') {
												cancelEditing();
												e.currentTarget.blur();
											}
										}}
										use:autofocus
										class="px-2 py-1 border border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-20"
									/>
								{:else}
									<span
										class="text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
										onclick={(e) => {
											e.stopPropagation();
											startEditing(chapterIndex, 'volume');
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
										onblur={(e) =>
											updateChapterField(chapterIndex, 'number', e.currentTarget.value)}
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												e.currentTarget.blur();
											} else if (e.key === 'Escape') {
												cancelEditing();
												e.currentTarget.blur();
											}
										}}
										use:autofocus
										class="px-2 py-1 border border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-20"
									/>
								{:else}
									<span
										class="text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
										onclick={(e) => {
											e.stopPropagation();
											startEditing(chapterIndex, 'number');
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
						</div>
						<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Original: {getFolderName(chapter)} • {chapter.pages.length} page{chapter.pages
								.length !== 1
								? 's'
								: ''}
						</div>
					</div>

					{#if isManuallyEdited}
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								revertChapter(chapterIndex);
							}}
							class="flex-shrink-0 px-3 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors flex items-center gap-1.5"
							title="Revert to default"
						>
							<span class="i-mdi-undo text-base"></span>
							<span>Revert</span>
						</button>
					{/if}

					{#if onRemoveChapter}
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								onRemoveChapter?.(chapterIndex, e);
							}}
							class="flex-shrink-0 px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors flex items-center gap-1.5"
							title="Remove chapter"
						>
							<span class="i-mdi-delete text-base"></span>
							<span>Remove</span>
						</button>
					{/if}
				</div>

				<!-- Expanded Content with Image Previews -->
				{#if isExpanded}
					<ImagePreviewGrid
						files={chapter.pages.map((page) => ({
							file: new SelectedFile(page.pageFile, page.pageFile.name),
							folder: {} as SelectedFolder
						}))}
						onRemove={onRemovePage
							? (fileIndex, event) => handleRemovePage(chapterIndex, fileIndex, event)
							: undefined}
					/>
				{/if}
			</div>
		{/each}
	</div>
</div>
