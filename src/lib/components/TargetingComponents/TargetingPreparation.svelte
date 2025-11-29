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
</script>

<div>
	<div class="flex flex-col gap-2">
		<h2 class="text-xl font-semibold">Targeting Preparation</h2>
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
			class="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white rounded-md px-2 py-1"
			onclick={onDone}
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
