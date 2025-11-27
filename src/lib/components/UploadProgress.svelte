<script lang="ts">
	import type { ChapterState, ChapterPageState } from '$lib/core/UploadingState.svelte';
	import { ChapterStatus, ChapterPageStatus } from '$lib/core/UploadingState.svelte';
	import type { ChapterUploader } from '$lib/core/ChapterUploader.svelte';
	import { UploaderStatus } from '$lib/core/ChapterUploader.svelte';

	interface Props {
		uploader: ChapterUploader;
	}

	let { uploader }: Props = $props();

	function getStatusColor(status: ChapterStatus | UploaderStatus): string {
		switch (status) {
			case ChapterStatus.NOT_STARTED:
			case UploaderStatus.NOT_STARTED:
				return 'bg-gray-300 dark:bg-gray-600';
			case ChapterStatus.WAITING:
			case ChapterStatus.IN_PROGRESS:
			case UploaderStatus.IN_PROGRESS:
				return 'bg-blue-500';
			case ChapterStatus.COMPLETED:
			case UploaderStatus.COMPLETED:
				return 'bg-green-500';
			case ChapterStatus.FAILED:
			case UploaderStatus.FAILED:
				return 'bg-red-500';
			default:
				return 'bg-gray-300 dark:bg-gray-600';
		}
	}

	function getPageStatusColor(status: ChapterPageStatus): string {
		switch (status) {
			case ChapterPageStatus.NOT_STARTED:
				return 'bg-gray-300 dark:bg-gray-600';
			case ChapterPageStatus.WAITING:
				return 'bg-yellow-400';
			case ChapterPageStatus.UPLOADING:
				return 'bg-blue-500';
			case ChapterPageStatus.UPLOADED:
				return 'bg-green-500';
			case ChapterPageStatus.FAILED:
				return 'bg-red-500';
			default:
				return 'bg-gray-300 dark:bg-gray-600';
		}
	}

	function getStatusText(status: ChapterStatus | UploaderStatus): string {
		switch (status) {
			case ChapterStatus.NOT_STARTED:
			case UploaderStatus.NOT_STARTED:
				return 'Not Started';
			case ChapterStatus.WAITING:
				return 'Waiting';
			case ChapterStatus.IN_PROGRESS:
			case UploaderStatus.IN_PROGRESS:
				return 'In Progress';
			case ChapterStatus.COMPLETED:
			case UploaderStatus.COMPLETED:
				return 'Completed';
			case ChapterStatus.FAILED:
			case UploaderStatus.FAILED:
				return 'Failed';
			default:
				return 'Unknown';
		}
	}

	function getPageStatusText(status: ChapterPageStatus): string {
		switch (status) {
			case ChapterPageStatus.NOT_STARTED:
				return 'Not Started';
			case ChapterPageStatus.WAITING:
				return 'Waiting';
			case ChapterPageStatus.UPLOADING:
				return 'Uploading';
			case ChapterPageStatus.UPLOADED:
				return 'Uploaded';
			case ChapterPageStatus.FAILED:
				return 'Failed';
			default:
				return 'Unknown';
		}
	}

	function formatProgress(progress: number): string {
		return `${Math.round(progress * 100)}%`;
	}
</script>

<div class="space-y-4">
	<!-- Overall Progress Header -->
	<div
		class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600"
	>
		<div class="flex items-center justify-between mb-2">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Upload Progress</h3>
			<div class="flex items-center gap-2">
				<span
					class="px-3 py-1 rounded-full text-sm font-medium text-white {getStatusColor(
						uploader.status
					)}"
				>
					{getStatusText(uploader.status)}
				</span>
				<span class="text-sm text-gray-600 dark:text-gray-400">
					{formatProgress(uploader.progress)}
				</span>
			</div>
		</div>
		<!-- Overall Progress Bar -->
		<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
			<div
				class="h-full transition-all duration-300 {getStatusColor(uploader.status)}"
				style="width: {uploader.progress * 100}%"
			></div>
		</div>
		{#if uploader.error}
			<div class="mt-2 text-sm text-red-600 dark:text-red-400">{uploader.error}</div>
		{/if}
		{#if uploader.currentChapterIndex >= 0 && uploader.currentChapterIndex < uploader.chapters.length}
			<div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
				Uploading chapter {uploader.currentChapterIndex + 1} of {uploader.chapters.length}
			</div>
		{/if}
	</div>

	<!-- Chapters List -->
	<div class="space-y-3">
		{#each uploader.chapters as chapter, chapterIndex}
			{@const isCurrentChapter = chapterIndex === uploader.currentChapterIndex}
			{@const chapterProgress = chapter.progress}
			{@const chapterStatus = chapter.status}

			<div
				class="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 {isCurrentChapter
					? 'ring-2 ring-blue-500'
					: ''}"
			>
				<!-- Chapter Header -->
				<div class="flex items-center justify-between mb-2">
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 flex-wrap">
							<h4 class="font-semibold text-gray-900 dark:text-gray-100 truncate">
								{chapter.chapterTitle || 'Untitled Chapter'}
							</h4>
							{#if chapter.chapterVolume !== null}
								<span class="text-sm text-gray-600 dark:text-gray-400">
									Vol. {chapter.chapterVolume}
								</span>
							{/if}
							{#if chapter.chapterNumber !== null}
								<span class="text-sm text-gray-600 dark:text-gray-400">
									Ch. {chapter.chapterNumber}
								</span>
							{/if}
						</div>
						{#if chapter.originalFolderName}
							<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
								{chapter.originalFolderName}
							</div>
						{/if}
					</div>
					<div class="flex items-center gap-2 ml-4">
						<span
							class="px-2 py-1 rounded text-xs font-medium text-white {getStatusColor(
								chapterStatus
							)}"
						>
							{getStatusText(chapterStatus)}
						</span>
						<span class="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">
							{formatProgress(chapterProgress)}
						</span>
					</div>
				</div>

				<!-- Chapter Progress Bar -->
				<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden mb-3">
					<div
						class="h-full transition-all duration-300 {getStatusColor(chapterStatus)}"
						style="width: {chapterProgress * 100}%"
					></div>
				</div>

				{#if chapter.error}
					<div class="mb-2 text-sm text-red-600 dark:text-red-400">{chapter.error}</div>
				{/if}

				<!-- Pages Progress Visualization -->
				<div class="mt-2">
					<div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
						Pages ({chapter.pages.length})
					</div>
					<div class="flex flex-wrap gap-1">
						{#each chapter.pages as page, pageIndex}
							{@const pageProgress = page.progress}
							{@const pageStatus = page.status}
							<div
								class="relative h-6 min-w-[24px] flex-1 rounded overflow-hidden border border-gray-300 dark:border-gray-600 {getPageStatusColor(
									pageStatus
								)}"
								title="{page.pageName} - {getPageStatusText(pageStatus)} ({formatProgress(
									pageProgress
								)})"
							>
								<!-- Progress fill from left to right -->
								<div
									class="absolute inset-0 {getPageStatusColor(
										pageStatus
									)} transition-all duration-300"
									style="width: {pageProgress * 100}%"
								></div>
								<!-- Page number overlay (optional, only show if there's space) -->
								{#if chapter.pages.length <= 20}
									<div
										class="absolute inset-0 flex items-center justify-center text-xs font-medium text-white mix-blend-difference"
									>
										{pageIndex + 1}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
