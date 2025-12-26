<script lang="ts">
	import type { ChapterState } from '$lib/core/UploadingState.svelte';
	import { getContext } from 'svelte';
	import {
		TargetingState,
		targetingStateContext
	} from '../TargetingComponents/TargetingState.svelte';
	import TargetingEditableField from '../TargetingComponents/TargetingEditableField.svelte';
	import TargetingEditableGroup from '../TargetingComponents/TargetingEditableGroup.svelte';
	import { CHAPTER_TITLE_EXPORT_RESOLVER } from '$lib/core/ChapterTitleExportResolver.svelte';

	const targetingState = getContext<TargetingState>(targetingStateContext);
	if (!targetingState) {
		throw new Error(
			'GuidedChapterEditor must be used within a component that provides TargetingState context'
		);
	}

	interface Props {
		index: number;
		chapter: ChapterState;
		class?: string;
	}

	let { index, chapter, class: className = '' }: Props = $props();

	let isEditingVolumeChapter = $state(false);
	let volumeChapterCombinations = $state<
		Array<{ volume: string; chapter: string; title: string | null }>
	>([]);
	let isLoadingCombinations = $state(false);
	let buttonRef = $state<HTMLButtonElement | null>(null);
	let dropdownRef = $state<HTMLDivElement | null>(null);
	let dropdownPosition = $state<{ top: number; left: number; width: number } | null>(null);
	let savedButtonRect = $state<DOMRect | null>(null);

	function toggleDeleted() {
		chapter.isDeleted = !chapter.isDeleted;
	}

	async function startEditingVolumeChapter() {
		if (isEditingVolumeChapter) {
			return;
		}

		// Capture button position before opening dropdown
		if (buttonRef) {
			savedButtonRect = buttonRef.getBoundingClientRect();
		}

		isEditingVolumeChapter = true;
		isLoadingCombinations = true;

		try {
			const seriesId = chapter.associatedSeries?.seriesId;
			if (!seriesId) {
				console.warn('No series ID available for chapter');
				isEditingVolumeChapter = false;
				return;
			}

			await CHAPTER_TITLE_EXPORT_RESOLVER.load();
			volumeChapterCombinations =
				await CHAPTER_TITLE_EXPORT_RESOLVER.getUniqueVolumeChapterCombinations(seriesId);
		} catch (error) {
			console.error('Failed to load volume/chapter combinations:', error);
		} finally {
			isLoadingCombinations = false;
		}
	}

	function stopEditingVolumeChapter() {
		isEditingVolumeChapter = false;
		dropdownPosition = null;
		savedButtonRect = null;
	}

	function selectVolumeChapter(combination: {
		volume: string;
		chapter: string;
		title: string | null;
	}) {
		// Mark fields as manually edited
		if (!chapter.manuallyEditedFields.has('volume')) {
			if (!chapter.originalFieldValues.has('volume')) {
				chapter.originalFieldValues.set('volume', chapter.chapterVolume);
			}
			chapter.manuallyEditedFields.add('volume');
		}
		if (!chapter.manuallyEditedFields.has('chapter')) {
			if (!chapter.originalFieldValues.has('chapter')) {
				chapter.originalFieldValues.set('chapter', chapter.chapterNumber);
			}
			chapter.manuallyEditedFields.add('chapter');
		}
		if (!chapter.manuallyEditedFields.has('title')) {
			if (!chapter.originalFieldValues.has('title')) {
				chapter.originalFieldValues.set('title', chapter.chapterTitle);
			}
			chapter.manuallyEditedFields.add('title');
		}

		// Update chapter values
		chapter.chapterVolume = combination.volume || null;
		chapter.chapterNumber = combination.chapter || null;
		chapter.chapterTitle = combination.title || null;

		stopEditingVolumeChapter();
	}

	function formatCombinationDisplay(combination: {
		volume: string;
		chapter: string;
		title: string | null;
	}): string {
		const vol = combination.volume || 'N/A';
		const ch = combination.chapter || 'N/A';
		const title = combination.title ? ` - ${combination.title}` : '';
		return `Vol ${vol}, Ch ${ch}${title}`;
	}

	function updateDropdownPosition() {
		if (!savedButtonRect) {
			return;
		}

		const rect = savedButtonRect;
		const viewportHeight = window.innerHeight;
		const viewportWidth = window.innerWidth;
		const gap = 4;
		const maxDropdownHeight = 256;

		let actualDropdownHeight = maxDropdownHeight;
		if (dropdownRef) {
			const measuredHeight = dropdownRef.getBoundingClientRect().height;
			actualDropdownHeight = Math.min(measuredHeight, maxDropdownHeight);
		}

		const spaceBelow = viewportHeight - rect.bottom - gap;
		const spaceAbove = rect.top - gap;
		const openAbove = spaceBelow < maxDropdownHeight && spaceAbove > spaceBelow;

		let top: number;
		if (openAbove) {
			top = rect.top - actualDropdownHeight - gap;
			if (top < gap) top = gap;
		} else {
			top = rect.bottom + gap;
			if (top + actualDropdownHeight > viewportHeight) {
				top = Math.max(gap, viewportHeight - actualDropdownHeight - gap);
			}
		}

		let left = rect.left;
		const minWidth = 320;
		const maxWidth = Math.min(400, viewportWidth - gap * 2);
		const width = Math.max(minWidth, Math.min(maxWidth, rect.width));

		if (left + width > viewportWidth - gap) {
			left = viewportWidth - width - gap;
		}
		if (left < gap) {
			left = gap;
		}

		dropdownPosition = { top, left, width };
	}

	$effect(() => {
		if (isEditingVolumeChapter) {
			if (!savedButtonRect) {
				dropdownPosition = null;
				return;
			}

			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					updateDropdownPosition();
				});
			});

			const handleResize = () => updateDropdownPosition();

			const handleClickOutside = (event: MouseEvent) => {
				const target = event.target as HTMLElement;
				if (
					dropdownRef &&
					!dropdownRef.contains(target) &&
					buttonRef &&
					!buttonRef.contains(target)
				) {
					stopEditingVolumeChapter();
				}
			};

			const timeoutId = setTimeout(() => {
				window.addEventListener('resize', handleResize);
				document.addEventListener('click', handleClickOutside, true);
			}, 10);

			return () => {
				clearTimeout(timeoutId);
				window.removeEventListener('resize', handleResize);
				document.removeEventListener('click', handleClickOutside, true);
			};
		} else {
			dropdownPosition = null;
		}
	});

	$effect(() => {
		if (isEditingVolumeChapter && dropdownRef) {
			requestAnimationFrame(() => {
				updateDropdownPosition();
			});
		}
	});
</script>

<div
	class="bg-surface-hover rounded-md p-3 flex flex-col gap-2 {chapter.isDeleted
		? 'opacity-50 border-2 border-red-500/50'
		: ''} {className}"
>
	<div class="flex flex-row gap-4 items-center justify-between">
		<div class="flex flex-row gap-4 items-center">
			<span class="text-sm font-bold text-app">#{index + 1}</span>
			{#if chapter.isDeleted}
				<span
					class="px-2 py-1 rounded text-xs font-semibold bg-red-500/20 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500"
				>
					Removed
				</span>
			{/if}
			<div class="flex flex-row gap-2 items-center">
				<span class="text-xs text-muted">Vol:</span>
				<span class="text-sm text-app">{chapter.chapterVolume ?? 'N/A'}</span>
			</div>
			<div class="flex flex-row gap-2 items-center">
				<span class="text-xs text-muted">Ch:</span>
				<span class="text-sm text-app">{chapter.chapterNumber ?? 'N/A'}</span>
			</div>
			{#if chapter.associatedSeries?.seriesId}
				<button
					bind:this={buttonRef}
					type="button"
					onclick={(e) => {
						e.stopPropagation();
						startEditingVolumeChapter();
					}}
					class="bg-surface hover:bg-surface-hover cursor-pointer rounded-md p-1 text-xs"
					title="Edit volume and chapter"
					aria-label="Edit volume and chapter"
				>
					<div class="i-mdi-pencil h-4 w-4"></div>
				</button>
			{/if}
			<div class="flex flex-row gap-2 items-center">
				<span class="text-xs text-muted">Pages:</span>
				<span class="text-sm text-app">{chapter.pages.length}</span>
			</div>
		</div>
		<button
			type="button"
			class="clickable-hint rounded-md px-3 py-1 text-xs {chapter.isDeleted
				? 'btn-success'
				: 'btn-danger'}"
			onclick={toggleDeleted}
			title={chapter.isDeleted ? 'Restore chapter' : 'Mark as removed'}
		>
			{#if chapter.isDeleted}
				<div class="flex flex-row gap-1 items-center">
					<div class="i-mdi-restore h-4 w-4"></div>
					<span>Restore</span>
				</div>
			{:else}
				<div class="flex flex-row gap-1 items-center">
					<div class="i-mdi-delete h-4 w-4"></div>
					<span>Remove</span>
				</div>
			{/if}
		</button>
	</div>
	<div class="flex flex-row gap-2 items-center">
		<span class="text-xs text-muted">Title:</span>
		<div class="flex flex-row gap-2 items-center flex-1">
			<TargetingEditableField
				bind:value={chapter.chapterTitle}
				textClass="text-sm text-app font-medium"
				fieldName="title"
				{chapter}
			/>
			{#if !chapter.chapterTitle}
				<span class="text-xs text-muted italic">
					({chapter.originalFolderPath || 'Untitled'})
				</span>
			{/if}
		</div>
	</div>
	<div class="flex flex-row gap-2 items-center">
		<span class="text-xs text-muted">Groups:</span>
		<TargetingEditableGroup bind:groups={chapter.associatedGroup} fieldName="groups" {chapter} />
	</div>
	<div class="flex flex-row gap-2 items-center">
		<span class="text-xs text-muted">Path:</span>
		<span class="text-xs text-muted font-mono truncate">{chapter.originalFolderPath}</span>
	</div>
</div>

{#if isEditingVolumeChapter && dropdownPosition}
	<div
		bind:this={dropdownRef}
		class="fixed z-[9999] bg-surface border border-surface rounded-md shadow-lg max-h-64 overflow-y-auto min-w-80 text-app"
		style="top: {dropdownPosition.top}px; left: {dropdownPosition.left}px; width: {dropdownPosition.width}px;"
		onclick={(e) => e.stopPropagation()}
		role="presentation"
	>
		<div class="p-2 space-y-1">
			{#if isLoadingCombinations}
				<div class="px-3 py-2 text-sm text-muted">Loading combinations...</div>
			{:else if volumeChapterCombinations.length === 0}
				<div class="px-3 py-2 text-sm text-muted">No volume/chapter combinations available</div>
			{:else}
				{#each volumeChapterCombinations as combination}
					<button
						type="button"
						onclick={() => selectVolumeChapter(combination)}
						class="w-full text-left px-3 py-2 text-sm text-app hover:bg-surface-hover rounded transition-colors {chapter.chapterVolume ===
							combination.volume && chapter.chapterNumber === combination.chapter
							? 'bg-blue-50 dark:bg-blue-900/20 font-medium'
							: ''}"
					>
						<div class="flex flex-col">
							<span>{formatCombinationDisplay(combination)}</span>
						</div>
					</button>
				{/each}
			{/if}
		</div>
	</div>
{/if}
