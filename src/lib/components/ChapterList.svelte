<script lang="ts">
	import type { ChapterState, ChapterPageState } from '$lib/core/UploadingState.svelte';
	import ImagePreviewGrid from './ImagePreviewGrid.svelte';
	import { getFolderPath, SelectedFile } from '$lib/core/GroupedFolders';
	import type { SelectedFolder } from '$lib/core/GroupedFolders';
	import { getContext } from 'svelte';
	import { globalStateContext, type GlobalState } from '$lib/core/GlobalState.svelte';

	interface Props {
		rootFolder?: SelectedFolder;
	}

	let { rootFolder }: Props = $props();

	const globalState = getContext(globalStateContext) as GlobalState;
	const chapters = $derived(globalState.chapterStates);

	// Track expanded state (by originalFolderName for stability after sorting)
	let expandedChapters = $state<Set<string>>(new Set());

	// Track manually edited chapters (by originalFolderName for stability after sorting)
	let manuallyEditedChapters = $state<Set<string>>(new Set());

	// Track editing state per chapter (by originalFolderName for stability after sorting)
	let editingChapter = $state<string | null>(null);
	let editingField = $state<'title' | 'volume' | 'number' | null>(null);

	// Batch editing regex inputs
	let titleRegex = $state<string>('');
	let volumeRegex = $state<string>('');
	let numberRegex = $state<string>('');

	function getChapterKey(chapter: ChapterState): string {
		return chapter.originalFolderName || `chapter-${chapters.indexOf(chapter)}`;
	}

	function toggleChapter(chapterIndex: number) {
		const chapter = chapters[chapterIndex];
		if (!chapter) return;
		const key = getChapterKey(chapter);
		const newSet = new Set(expandedChapters);
		if (newSet.has(key)) {
			newSet.delete(key);
		} else {
			newSet.add(key);
		}
		expandedChapters = newSet;
	}

	function startEditing(chapterIndex: number, field: 'title' | 'volume' | 'number') {
		const chapter = chapters[chapterIndex];
		if (!chapter) return;
		const key = getChapterKey(chapter);
		editingChapter = key;
		editingField = field;
		manuallyEditedChapters.add(key);
		manuallyEditedChapters = new Set(manuallyEditedChapters);
	}

	function sortChapters(chapters: ChapterState[]): ChapterState[] {
		return [...chapters].sort((a, b) => {
			// Sort by volume first (null volumes go last)
			const volumeA = a.chapterVolume;
			const volumeB = b.chapterVolume;

			if (volumeA === null && volumeB === null) {
				// Both null, continue to chapter number comparison
			} else if (volumeA === null) {
				return 1; // null goes after non-null
			} else if (volumeB === null) {
				return -1; // non-null goes before null
			} else {
				const volumeCompare = String(volumeA).localeCompare(String(volumeB), undefined, {
					numeric: true,
					sensitivity: 'base'
				});
				if (volumeCompare !== 0) {
					return volumeCompare;
				}
			}

			// Then sort by chapter number (null numbers go last)
			const numberA = a.chapterNumber;
			const numberB = b.chapterNumber;

			if (numberA === null && numberB === null) {
				return 0; // Both null, equal
			} else if (numberA === null) {
				return 1; // null goes after non-null
			} else if (numberB === null) {
				return -1; // non-null goes before null
			} else {
				return String(numberA).localeCompare(String(numberB), undefined, {
					numeric: true,
					sensitivity: 'base'
				});
			}
		});
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

		// Sort chapters if volume or number was changed
		if (field === 'volume' || field === 'number') {
			const sortedChapters = sortChapters(chapters);
			globalState.chapterStates = sortedChapters;
		} else {
			// Create a new array reference to trigger reactivity
			globalState.chapterStates = [...chapters];
		}
	}

	function cancelEditing() {
		editingChapter = null;
		editingField = null;
	}

	function revertChapter(chapterIndex: number) {
		const chapter = chapters[chapterIndex];
		if (!chapter || !chapter.originalFolderName) return;

		const chapterKey = getChapterKey(chapter);

		// Revert to defaults
		chapter.chapterTitle = chapter.originalFolderName;
		chapter.chapterVolume = null;
		chapter.chapterNumber = chapterIndex + 1; // Sequential index (1-based)

		manuallyEditedChapters.delete(chapterKey);
		manuallyEditedChapters = new Set(manuallyEditedChapters);

		// Sort chapters after reverting volume/number
		const sortedChapters = sortChapters(chapters);
		globalState.chapterStates = sortedChapters;
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
		console.log('Applying batch extraction');
		let hasChanges = false;
		let volumeOrNumberChanged = false;

		for (let i = 0; i < chapters.length; i++) {
			const chapter = chapters[i];
			if (!chapter.originalFolderName) continue;
			const chapterKey = getChapterKey(chapter);

			// Skip manually edited chapters
			if (manuallyEditedChapters.has(chapterKey)) continue;

			console.log(`Chapter ${i}: ${chapter.originalFolderName}`);

			// Extract title
			if (titleRegex.trim()) {
				const extractedTitle = extractWithRegex(chapter.originalFolderName, titleRegex);
				if (extractedTitle !== null && chapter.chapterTitle !== extractedTitle) {
					chapter.chapterTitle = extractedTitle;
					hasChanges = true;
					console.log(`Chapter title changed from ${chapter.chapterTitle} to ${extractedTitle}`);
				}
			}

			// Extract volume
			if (volumeRegex.trim()) {
				const extractedVolume = extractNumberWithRegex(chapter.originalFolderName, volumeRegex);
				if (extractedVolume !== null && chapter.chapterVolume !== extractedVolume) {
					console.log(`Chapter volume changed from ${chapter.chapterVolume} to ${extractedVolume}`);
					chapter.chapterVolume = extractedVolume;
					hasChanges = true;
					volumeOrNumberChanged = true;
				}
			}

			// Extract number
			if (numberRegex.trim()) {
				const extractedNumber = extractNumberWithRegex(chapter.originalFolderName, numberRegex);
				if (extractedNumber !== null && chapter.chapterNumber !== extractedNumber) {
					console.log(`Chapter number changed from ${chapter.chapterNumber} to ${extractedNumber}`);
					chapter.chapterNumber = extractedNumber;
					hasChanges = true;
					volumeOrNumberChanged = true;
				}
			}
		}

		if (hasChanges) {
			// Sort chapters if volume or number was changed
			if (volumeOrNumberChanged) {
				const sortedChapters = sortChapters(chapters);
				globalState.chapterStates = sortedChapters;
			} else {
				// Create a new array reference to trigger reactivity
				globalState.chapterStates = [...chapters];
			}
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
			globalState.chapterStates = chapters.filter((_, i) => i !== chapterIndex);
		} else {
			// Create a new array reference to trigger reactivity
			globalState.chapterStates = [...chapters];
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
						placeholder="e.g., ^(.+?)\s+-\s+Vol"
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
						placeholder="e.g., Vol\.\s*(\d+)"
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
						placeholder="e.g., Ch\.\s*(\d+)"
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
	<div
		class="max-h-[600px] overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-4"
	>
		<div class="space-y-4">
			{#each chapters as chapter, chapterIndex}
				{@const chapterKey = getChapterKey(chapter)}
				{@const isExpanded = expandedChapters.has(chapterKey)}
				{@const isManuallyEdited = manuallyEditedChapters.has(chapterKey)}
				{@const isEditingTitle = editingChapter === chapterKey && editingField === 'title'}
				{@const isEditingVolume = editingChapter === chapterKey && editingField === 'volume'}
				{@const isEditingNumber = editingChapter === chapterKey && editingField === 'number'}

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
											onblur={(e) =>
												updateChapterField(chapterIndex, 'title', e.currentTarget.value)}
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

						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								globalState.chapterStates = chapters.filter((_, i) => i !== chapterIndex);
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
							onRemove={(fileIndex, event) => handleRemovePage(chapterIndex, fileIndex, event)}
						/>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
