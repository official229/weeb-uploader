<script lang="ts">
	import { UploaderStatus } from '$lib/core/ChapterUploader.svelte';
	import {
		ChapterPageStatus,
		ChapterStatus,
		type ChapterState
	} from '$lib/core/UploadingState.svelte';

	interface Props {
		chapter: ChapterState;
	}

	let { chapter }: Props = $props();

	function getPageStatusColorValue(status: ChapterPageStatus): string {
		switch (status) {
			case ChapterPageStatus.NOT_STARTED:
				return 'rgb(209 213 219)'; // gray-300
			case ChapterPageStatus.WAITING:
				return 'rgb(250 204 21)'; // yellow-400
			case ChapterPageStatus.UPLOADING:
				return 'rgb(59 130 246)'; // blue-500
			case ChapterPageStatus.UPLOADED:
				return 'rgb(34 197 94)'; // green-500
			case ChapterPageStatus.FAILED:
				return 'rgb(239 68 68)'; // red-500
			default:
				return 'rgb(209 213 219)'; // gray-300
		}
	}

	function getChapterStatusColorValue(status: ChapterStatus): string {
		switch (status) {
			case ChapterStatus.NOT_STARTED:
				return 'rgb(209 213 219)'; // gray-300
			case ChapterStatus.WAITING:
				return 'rgb(250 204 21)'; // yellow-400
			case ChapterStatus.IN_PROGRESS:
				return 'rgb(59 130 246)'; // blue-500
			case ChapterStatus.COMPLETED:
				return 'rgb(34 197 94)'; // green-500
			case ChapterStatus.FAILED:
				return 'rgb(239 68 68)'; // red-500
		}
	}

	function prettyFormatProgress(progress: number): string {
		const roundedProgress = Math.round(progress * 100);
		return `${roundedProgress}%`;
	}
</script>

<div
	class="flex flex-col gap-2 bg-gray-100 rounded-md p-2 b-2"
	style="border-color: {getChapterStatusColorValue(chapter.status)}"
>
	<div class="flex flex-row gap-2 items-center">
		<p class="font-bold">{chapter.chapterTitle}</p>
		<p class="text-sm text-gray-500">
			Vol. {chapter.chapterVolume ?? 'N/A'} Ch. {chapter.chapterNumber ?? 'N/A'}
		</p>
	</div>
	<p class="text-sm text-gray-500">{chapter.originalFolderPath}</p>

	<div class="relative h-5 w-full border-1 border-gray-300 overflow-clip rounded-lg">
		<div
			class="h-full"
			style="width: {chapter.progress * 100}%; background-color: {getChapterStatusColorValue(
				chapter.status
			)}"
		></div>
		<p class="text-xs absolute inset-0 text-black flex items-center justify-center">
			{prettyFormatProgress(chapter.progress)}
		</p>
	</div>

	{#if chapter.error}
		<p class="text-sm text-red-500">{chapter.error}</p>
	{/if}

	<div>
		<p class="text-sm text-gray-500">Pages ({chapter.pages.length})</p>
	</div>
	<div class="flex flex-row flex-wrap gap-2 items-center">
		{#each chapter.pages as page}
			<div
				class="relative h-7 min-w-7 grow-1 flex items-center justify-center border-1 rounded-md transition-all duration-300"
				style="border-color: {getPageStatusColorValue(page.status)}"
			>
				<div
					class="h-full"
					style="
					width: {page.progress * 100}%;
					background-color: {getPageStatusColorValue(page.status)};
					"
				></div>
				<p class="text-xs absolute inset-0 text-black flex items-center justify-center">
					{page.pageIndex + 1}
				</p>
			</div>
		{/each}
	</div>
</div>
