<script lang="ts">
	import type { ChapterState } from '$lib/core/UploadingState.svelte';
	import { ChapterUploadingGroup } from '$lib/core/UploadingState.svelte';
	import type { SelectedFolder } from '$lib/core/GroupedFolders';
	import { getContext } from 'svelte';
	import { globalStateContext, type GlobalState } from '$lib/core/GlobalState.svelte';
	import ChapterItem from './ChapterItem.svelte';
	import BatchExtraction from './BatchExtraction.svelte';
	import BatchGroupAssignment from './BatchGroupAssignment.svelte';

	interface Props {
		rootFolder?: SelectedFolder;
	}

	let { rootFolder }: Props = $props();

	const globalState = getContext(globalStateContext) as GlobalState;
	const chapters = $derived(globalState.chapterStates);
	const availableGroups = $derived(globalState.availableScanGroups);

	// Track expanded state (by originalFolderName for stability after sorting)
	let expandedChapters = $state<Set<string>>(new Set());

	// Track manually edited chapters (by originalFolderName for stability after sorting)
	let manuallyEditedChapters = $state<Set<string>>(new Set());

	// Track editing state per chapter (by originalFolderName for stability after sorting)
	let editingChapter = $state<string | null>(null);
	let editingField = $state<'title' | 'volume' | 'number' | null>(null);

	function getChapterKey(chapter: ChapterState): string {
		return chapter.originalFolderPath || `chapter-${chapters.indexOf(chapter)}`;
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
		if (!chapter || !chapter.originalFolderPath) return;

		const chapterKey = getChapterKey(chapter);

		// Revert to defaults
		chapter.chapterTitle = chapter.originalFolderPath;
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

	function applyBatchExtraction(titleRegex: string, volumeRegex: string, numberRegex: string) {
		console.log('Applying batch extraction');
		let hasChanges = false;
		let volumeOrNumberChanged = false;

		for (let i = 0; i < chapters.length; i++) {
			const chapter = chapters[i];
			if (!chapter.originalFolderPath) continue;
			const chapterKey = getChapterKey(chapter);

			// Skip manually edited chapters
			if (manuallyEditedChapters.has(chapterKey)) continue;

			console.log(`Chapter ${i}: ${chapter.originalFolderPath}`);

			// Extract title
			if (titleRegex.trim()) {
				const extractedTitle = extractWithRegex(chapter.originalFolderPath, titleRegex);
				if (extractedTitle !== null && chapter.chapterTitle !== extractedTitle) {
					chapter.chapterTitle = extractedTitle;
					hasChanges = true;
					console.log(`Chapter title changed from ${chapter.chapterTitle} to ${extractedTitle}`);
				}
			}

			// Extract volume
			if (volumeRegex.trim()) {
				const extractedVolume = extractNumberWithRegex(chapter.originalFolderPath, volumeRegex);
				if (extractedVolume !== null && chapter.chapterVolume !== extractedVolume) {
					console.log(`Chapter volume changed from ${chapter.chapterVolume} to ${extractedVolume}`);
					chapter.chapterVolume = extractedVolume;
					hasChanges = true;
					volumeOrNumberChanged = true;
				}
			}

			// Extract number
			if (numberRegex.trim()) {
				const extractedNumber = extractNumberWithRegex(chapter.originalFolderPath, numberRegex);
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
		if (rootFolder && chapter.originalFolderPath) {
			// Try to find the folder in the tree to get full path
			// For now, just return the original folder name
			return chapter.originalFolderPath;
		}
		return chapter.originalFolderPath || 'Unknown';
	}

	// Group assignment functions
	function assignGroupsToAll(groupIds: string[]) {
		for (const chapter of chapters) {
			if (!chapter.associatedGroup) {
				chapter.associatedGroup = new ChapterUploadingGroup();
			}
			chapter.associatedGroup.groupIds = [...groupIds];
		}
		globalState.chapterStates = [...chapters];
	}

	function assignGroupsToRange(groupIds: string[], start: number, end: number) {
		// Convert 1-based input to 0-based index
		const startIdx = Math.min(start - 1, end - 1);
		const endIdx = Math.max(start - 1, end - 1);

		for (let i = startIdx; i <= endIdx && i < chapters.length; i++) {
			if (i < 0) continue;
			const chapter = chapters[i];
			if (!chapter.associatedGroup) {
				chapter.associatedGroup = new ChapterUploadingGroup();
			}
			chapter.associatedGroup.groupIds = [...groupIds];
		}
		globalState.chapterStates = [...chapters];
	}

	function assignGroupsToChapter(chapterIndex: number, groupIds: string[]) {
		const chapter = chapters[chapterIndex];
		if (!chapter) return;

		if (groupIds.length === 0) {
			// Remove groups entirely if empty
			chapter.associatedGroup = null;
		} else {
			if (!chapter.associatedGroup) {
				chapter.associatedGroup = new ChapterUploadingGroup();
			}
			chapter.associatedGroup.groupIds = [...groupIds];
		}
		globalState.chapterStates = [...chapters];
	}

	function toggleGroupForChapter(chapterIndex: number, groupId: string) {
		const chapter = chapters[chapterIndex];
		if (!chapter) return;

		const currentGroupIds = chapter.associatedGroup?.groupIds ?? [];
		const newGroupIds = currentGroupIds.includes(groupId)
			? currentGroupIds.filter((id) => id !== groupId)
			: [...currentGroupIds, groupId];

		assignGroupsToChapter(chapterIndex, newGroupIds);
	}

	function clearGroupsForChapter(chapterIndex: number) {
		assignGroupsToChapter(chapterIndex, []);
	}

	function removeAllGroups() {
		for (let i = 0; i < chapters.length; i++) {
			clearGroupsForChapter(i);
		}
	}

	function getGroupName(groupId: string): string {
		const group = availableGroups.find((g) => g.groupId === groupId);
		return group?.groupName ?? groupId;
	}
</script>

<div class="space-y-6">
	<BatchExtraction onApply={applyBatchExtraction} />

	<BatchGroupAssignment
		{availableGroups}
		chaptersCount={chapters.length}
		onAssignToAll={assignGroupsToAll}
		onAssignToRange={assignGroupsToRange}
		onRemoveAll={removeAllGroups}
	/>

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

				<ChapterItem
					{chapter}
					{chapterIndex}
					{chapterKey}
					{rootFolder}
					{availableGroups}
					{isExpanded}
					{isManuallyEdited}
					{isEditingTitle}
					{isEditingVolume}
					{isEditingNumber}
					onToggle={() => toggleChapter(chapterIndex)}
					onStartEditing={(field) => startEditing(chapterIndex, field)}
					onUpdateField={(field, value) => updateChapterField(chapterIndex, field, value)}
					onCancelEditing={cancelEditing}
					onRevert={() => revertChapter(chapterIndex)}
					onRemove={() => {
						globalState.chapterStates = chapters.filter((_, i) => i !== chapterIndex);
					}}
					onRemovePage={(pageIndex, event) => handleRemovePage(chapterIndex, pageIndex, event)}
					onToggleGroup={(groupId) => toggleGroupForChapter(chapterIndex, groupId)}
					onClearGroups={() => clearGroupsForChapter(chapterIndex)}
					{getFolderName}
					{getGroupName}
				/>
			{/each}
		</div>
	</div>
</div>
