<script lang="ts">
	import type { ChapterState } from '$lib/core/UploadingState.svelte';
	import { getContext } from 'svelte';
	import {
		TargetingState,
		targetingStateContext
	} from '../TargetingComponents/TargetingState.svelte';
	import TargetingEditableField from '../TargetingComponents/TargetingEditableField.svelte';

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

	function toggleDeleted() {
		chapter.isDeleted = !chapter.isDeleted;
	}
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
		{#if chapter.associatedGroup.groupIds && chapter.associatedGroup.groupIds.length > 0}
			<div class="flex flex-row gap-1 flex-wrap">
				{#each chapter.associatedGroup.groupIds as groupId}
					{@const group = targetingState.availableScanGroups.find((g) => g.groupId === groupId)}
					<span
						class="text-xs bg-blue-500/20 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded"
					>
						{group?.groupName ?? groupId}
					</span>
				{/each}
			</div>
		{:else}
			<span class="text-xs text-muted italic">No groups assigned</span>
		{/if}
	</div>
	<div class="flex flex-row gap-2 items-center">
		<span class="text-xs text-muted">Path:</span>
		<span class="text-xs text-muted font-mono truncate">{chapter.originalFolderPath}</span>
	</div>
</div>
