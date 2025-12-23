<script lang="ts">
	import { getContext } from 'svelte';
	import {
		TargetingState,
		targetingStateContext
	} from '../TargetingComponents/TargetingState.svelte';
	import UploaderChapterProgression from './UploaderChapterProgression.svelte';
	import { ChapterPageStatus, ChapterStatus } from '$lib/core/UploadingState.svelte';
	import { ApiAuthContext, apiAuthContext } from '$lib/core/GlobalState.svelte';
	import { ChapterUploader } from '$lib/core/ChapterUploader.svelte';

	const authContext = getContext<ApiAuthContext>(apiAuthContext);
	if (!authContext) {
		throw new Error(
			'UploaderOrchestrator must be used within a component that provides ApiAuthContext context'
		);
	}

	const targetingState = getContext<TargetingState>(targetingStateContext);
	if (!targetingState) {
		throw new Error(
			'UploaderOrchestrator must be used within a component that provides TargetingState context'
		);
	}

	let chapters = $derived(targetingState.chapterStates.filter((chapter) => !chapter.isDeleted));

	interface Props {
		onDone: () => void;
		busy: boolean;
	}

	let { onDone, busy: working = $bindable(false) }: Props = $props();

	let chaptersTotal = $derived(chapters.length);
	let chaptersCompleted = $derived(
		chapters.filter((chapter) => chapter.status === ChapterStatus.COMPLETED).length
	);
	let pagesTotal = $derived(chapters.reduce((acc, chapter) => acc + chapter.pages.length, 0));
	let pagesUploaded = $derived(
		chapters.reduce(
			(acc, chapter) =>
				acc + chapter.pages.filter((page) => page.status === ChapterPageStatus.UPLOADED).length,
			0
		)
	);

	let chapterUploader = $state<ChapterUploader | null>(null);
	let isUploading = $state(false);

	function startUpload() {
		if (!authContext.apiToken) {
			alert('Please set up API authentication first');
			return;
		}

		if (!targetingState.seriesId) {
			alert('Please set a series ID first');
			return;
		}

		if (targetingState.chapterStates.length === 0) {
			alert('No chapters to upload');
			return;
		}

		console.log('Starting upload');
		console.log('API Token:', authContext.apiToken);
		console.log('Series ID:', targetingState.seriesId);
		console.log('Chapters:', targetingState.chapterStates);

		// Create a new uploader instance with current chapters
		chapterUploader = new ChapterUploader(chapters, authContext.apiToken);

		isUploading = true;
		working = true;

		// Start the upload
		chapterUploader
			.uploadAll()
			.then(() => {
				isUploading = false;
			})
			.catch((error) => {
				console.error('Upload error:', error);
				isUploading = false;
			})
			.finally(() => {
				working = false;
			});
	}

	function prettyFormatProgress(progress: number): string {
		const roundedProgress = Math.round(progress * 100);
		return `${roundedProgress}%`;
	}
</script>

<div class="flex flex-col gap-2">
	<h1 class="text-2xl font-bold text-app">Upload Progress</h1>

	<div class="flex flex-row gap-2">
		<button
			disabled={isUploading}
			class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-md"
			onclick={startUpload}>Start</button
		>
	</div>

	<div class="flex flex-col gap-2 bg-surface rounded-md p-2">
		<p class="text-sm text-app">Chapters: {chaptersCompleted} / {chaptersTotal}</p>
		<p class="text-sm text-app">Pages: {pagesUploaded} / {pagesTotal}</p>

		<div class="relative w-full h-5 bg-surface-hover rounded-md overflow-clip">
			<div
				class="h-full bg-blue-500 dark:bg-blue-400"
				style="width: {(pagesUploaded / pagesTotal) * 100}%"
			></div>
			<p class="text-xs absolute inset-0 text-app flex items-center justify-center">
				{prettyFormatProgress(pagesUploaded / pagesTotal)}
			</p>
		</div>
	</div>

	<div class="flex flex-col gap-2">
		{#each chapters as chapter, index}
			<UploaderChapterProgression {chapter} />
		{/each}
	</div>
</div>
