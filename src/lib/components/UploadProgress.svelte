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

	function getPageStatusBackgroundColorValue(status: ChapterPageStatus): string {
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

	function getStatusBorderColorValue(status: ChapterStatus | UploaderStatus): string {
		switch (status) {
			case ChapterStatus.NOT_STARTED:
			case UploaderStatus.NOT_STARTED:
				// gray-300 in light, gray-600 in dark
				return 'rgb(209 213 219)'; // gray-300
			case ChapterStatus.WAITING:
			case ChapterStatus.IN_PROGRESS:
			case UploaderStatus.IN_PROGRESS:
				return 'rgb(59 130 246)'; // blue-500
			case ChapterStatus.COMPLETED:
			case UploaderStatus.COMPLETED:
				return 'rgb(34 197 94)'; // green-500
			case ChapterStatus.FAILED:
			case UploaderStatus.FAILED:
				return 'rgb(239 68 68)'; // red-500
			default:
				return 'rgb(209 213 219)'; // gray-300
		}
	}

	function getStatusBackgroundColorValue(status: ChapterStatus | UploaderStatus): string {
		// Same color values as border, used for progress bars
		return getStatusBorderColorValue(status);
	}

	function getPageStatusBorderColorValue(status: ChapterPageStatus): string {
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
</script>

<div class="space-y-4">
	<!-- Overall Progress Header -->
	<div
		class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-l-4 border-gray-300 dark:border-gray-600"
		style="border-left-color: {getStatusBorderColorValue(uploader.status)}"
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
				class="h-full transition-all duration-300"
				style="width: {uploader.progress * 100}%; background-color: {getStatusBackgroundColorValue(
					uploader.status
				)}"
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
				class="p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-l-4 border-gray-300 dark:border-gray-600 {isCurrentChapter
					? 'ring-2 ring-blue-500 border-blue-400'
					: ''}"
				style={isCurrentChapter
					? undefined
					: `border-left-color: ${getStatusBorderColorValue(chapterStatus)}`}
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
						class="h-full transition-all duration-300"
						style="width: {chapterProgress *
							100}%; background-color: {getStatusBackgroundColorValue(chapterStatus)}"
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
							{@const isUploading = pageStatus === ChapterPageStatus.UPLOADING}
							{@const showProgress = isUploading && pageProgress > 0 && pageProgress < 1}
							<div
								class="relative h-8 min-w-[32px] flex-1 rounded overflow-hidden border-2"
								style="border-color: {getPageStatusBorderColorValue(pageStatus)}"
								title="{page.pageName} - {getPageStatusText(pageStatus)} ({formatProgress(
									pageProgress
								)})"
							>
								<!-- Progress fill from left to right -->
								<div
									class="absolute inset-0 transition-all duration-300 opacity-80"
									style="width: {pageProgress *
										100}%; background-color: {getPageStatusBackgroundColorValue(pageStatus)}"
								></div>
								<!-- Page number and status overlay -->
								<div
									class="absolute inset-0 flex flex-col items-center justify-center text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
								>
									<span class="leading-tight">{pageIndex + 1}</span>
									{#if showProgress}
										<span class="text-[10px] leading-tight mt-0.5">
											{formatProgress(pageProgress)}
										</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
