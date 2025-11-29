<script lang="ts">
	import type { SelectedFolder } from '$lib/core/GroupedFolders';
	import TargetingGroupValidator from '$lib/components/TargetingComponents/TargetingGroupValidator.svelte';
	import TargetingSeriesValidator from '$lib/components/TargetingComponents/TargetingSeriesValidator.svelte';
	import TargetedChapterEditor from './TargetedChapterEditor.svelte';
	import { TargetingState, targetingStateContext } from './TargetingState.svelte';
	import { getContext } from 'svelte';
	import {
		ChapterPageState,
		ChapterState,
		ChapterUploadingGroup,
		ChapterUploadingSeries
	} from '$lib/core/UploadingState.svelte';
	import TargetingBatchEdit from './TargetingBatchEdit.svelte';

	const targetingState = getContext<TargetingState>(targetingStateContext);
	if (!targetingState) {
		throw new Error(
			'TargetingPreparation must be used within a component that provides TargetingState context'
		);
	}

	interface Props {
		selectedFolders: SelectedFolder[];
		onDone: () => void;
	}

	const { selectedFolders, onDone }: Props = $props();

	let isAllready = $derived.by(() => targetingState.seriesId);

	$effect(() => {
		targetingState.chapterStates = selectedFolders.map((folder, index) => {
			const pages = folder.files.map(
				(file, pageIndex) => new ChapterPageState(file.file.name, pageIndex, file.file)
			);

			return new ChapterState(
				folder.path,
				folder.name,
				null,
				index.toString(),
				new ChapterUploadingSeries(),
				new ChapterUploadingGroup(),
				pages
			);
		});
	});

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

	$effect(() => {
		const sortAttempt = sortChapters(targetingState.chapterStates);

		// Only update on changes, comparing order
		for (let i = 0; i < sortAttempt.length; i++) {
			if (
				sortAttempt[i].originalFolderPath !== targetingState.chapterStates[i].originalFolderPath
			) {
				targetingState.chapterStates = sortAttempt;
				return;
			}
		}
	});
</script>

<div>
	<div class="flex flex-col gap-2">
		<h2 class="text-xl font-semibold">Targeting Preparation (Required)</h2>
		<TargetingSeriesValidator />
	</div>

	<div class="flex flex-col gap-2">
		<h2 class="text-xl font-semibold">Group Preparation</h2>
		<TargetingGroupValidator />
	</div>

	<div class="flex flex-col gap-2">
		<div class="flex flex-col gap-2">
			<h2 class="text-lg font-semibold">Batch Edit</h2>
			<TargetingBatchEdit bind:chapters={targetingState.chapterStates} />
		</div>

		<button
			type="button"
			class="cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-300 bg-blue-500 hover:bg-blue-600 text-white rounded-md px-2 py-1"
			onclick={onDone}
			disabled={!isAllready}
		>
			Start Upload
		</button>

		<div class="flex flex-col gap-2">
			<h2 class="text-lg font-semibold">Chapters</h2>
			<div class="flex flex-col gap-2 max-h-150 overflow-y-auto">
				{#each targetingState.chapterStates as chapter, index}
					<TargetedChapterEditor {index} bind:chapter={targetingState.chapterStates[index]} />
				{/each}
			</div>
		</div>
	</div>
</div>
