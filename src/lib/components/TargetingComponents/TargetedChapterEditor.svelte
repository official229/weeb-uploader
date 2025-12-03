<script lang="ts">
	import type { ChapterState } from '$lib/core/UploadingState.svelte';
	import { getContext } from 'svelte';
	import { TargetingState, targetingStateContext } from './TargetingState.svelte';
	import TargetingEditableField from './TargetingEditableField.svelte';
	import TargetedImageEditor from './TargetedImageEditor.svelte';
	import TargetingEditableGroup from './TargetingEditableGroup.svelte';

	const targetingState = getContext<TargetingState>(targetingStateContext);
	if (!targetingState) {
		throw new Error(
			'TargetedChapterEditor must be used within a component that provides TargetingState context'
		);
	}

	interface Props {
		index: number;
		chapter: ChapterState;
		class?: string;
	}

	const { index, chapter: ch = $bindable(), class: className }: Props = $props();

	let isExpanded = $state(false);

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}
</script>

<div
	class={['flex flex-col gap-2 justify-between overflow-clip rounded-lg bg-gray-200', className]}
>
	<!-- Chapter header -->
	<button
		class="flex flex-row justify-between w-full clickable-hint px-2 py-1"
		onclick={toggleExpanded}
	>
		<div class="flex flex-col gap-2">
			<!-- Index, Volume, chapter number, and Groups -->
			<div class="flex flex-row gap-2 items-center">
				<span class="text-sm text-gray-500 mr-3">{index + 1}.</span>

				<div class="flex flex-row gap-2 items-center">
					<span class="text-sm text-gray-500">Vol.</span>
					<TargetingEditableField bind:value={ch.chapterVolume} textClass="text-sm text-gray-500" />
				</div>
				<div class="flex flex-row gap-2 items-center">
					<span class="text-sm text-gray-500">Ch.</span>
					<TargetingEditableField bind:value={ch.chapterNumber} textClass="text-sm text-gray-500" />
				</div>

				<div class="flex flex-row gap-2 items-center">
					<span class="text-sm text-gray-500">Groups:</span>
					<TargetingEditableGroup bind:groups={ch.associatedGroup} />
				</div>
			</div>

			<!-- Original Folder Path -->
			<div class="flex flex-row gap-2 items-center">
				<span class="text-sm text-gray-500">Original:</span>
				<p class="text-sm text-gray-500">{ch.originalFolderPath}</p>
			</div>

			<!-- Title -->
			<div class="flex flex-row gap-2 items-center">
				<span class="text-sm text-gray-500">Title:</span>
				<TargetingEditableField
					bind:value={ch.chapterTitle}
					class="w-full"
					textClass="text-xl font-bold"
				/>
			</div>
		</div>

		<!-- Images preview indicator -->
		<div class="flex flex-row items-center">
			{#if isExpanded}
				<div aria-label="Collapse" class="w-10 h-10 i-mdi-chevron-up"></div>
			{:else}
				<div aria-label="Expand" class="w-10 h-10 i-mdi-chevron-down"></div>
			{/if}
		</div>
	</button>

	<!-- Chapter Images Preview -->
	{#if isExpanded}
		<div class="w-full bg-gray-300 rounded-lg p-2">
			<TargetedImageEditor bind:pages={ch.pages} />
		</div>
	{/if}
</div>
