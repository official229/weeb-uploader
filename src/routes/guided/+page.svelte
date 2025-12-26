<script lang="ts">
	import GuidedFolderSelector from '$lib/components/GuidedComponents/GuidedFolderSelector.svelte';
	import MangaFolderSelector from '$lib/components/GuidedComponents/MangaFolderSelector.svelte';
	import MangaProcessingTabs from '$lib/components/GuidedComponents/MangaProcessingTabs.svelte';
	import MangaProcessor from '$lib/components/GuidedComponents/MangaProcessor.svelte';
	import {
		GuidedState,
		GuidedWorkflowStep,
		MangaProcessingStatus,
		guidedStateContext
	} from '$lib/components/GuidedComponents/GuidedState.svelte';
	import { apiAuthContext, ApiAuthContext } from '$lib/core/GlobalState.svelte';
	import { setContext } from 'svelte';
	import ThemeToggle from '$lib/components/Common/ThemeToggle.svelte';
	import TargetingAuthValidator from '$lib/components/TargetingComponents/TargetingAuthValidator.svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';

	// Set up contexts
	const guidedState = new GuidedState();
	setContext(guidedStateContext, guidedState);
	setContext(apiAuthContext, new ApiAuthContext());

	let currentZipFile = $state<File | null>(null);

	function onFolderSelectionDone() {
		guidedState.workflowStep = GuidedWorkflowStep.SELECTING_MANGA_FOLDERS;
	}

	function onMangaSelectionDone() {
		guidedState.workflowStep = GuidedWorkflowStep.PROCESSING_MANGA;
		// Move to first selected zip file
		if (guidedState.selectedZipFiles.length > 0) {
			const firstZipFile = guidedState.selectedZipFiles[0];
			const index = guidedState.zipFiles.findIndex((z) => z.file === firstZipFile);
			if (index >= 0) {
				guidedState.currentZipIndex = index;
				currentZipFile = firstZipFile;
			}
		}
	}

	function onZipSelected(zipFile: File) {
		currentZipFile = zipFile;
		guidedState.setZipStatus(zipFile, MangaProcessingStatus.PROCESSING);
	}

	function onProcessingComplete() {
		// Move to next zip file automatically
		if (guidedState.moveToNextZip()) {
			const next = guidedState.currentZip;
			if (next) {
				currentZipFile = next.file;
				guidedState.setZipStatus(next.file, MangaProcessingStatus.PROCESSING);
			}
		} else {
			// All done
			currentZipFile = null;
		}
	}

	const authSettingsVisible = $derived(
		guidedState.workflowStep !== GuidedWorkflowStep.PROCESSING_MANGA
	);
</script>

<div class="container mx-auto p-6 flex flex-col gap-6">
	<div class="flex flex-row justify-between items-center">
		<h1 class="text-xl font-bold text-app">Guided Zip Manga Uploader</h1>
		<div class="flex flex-row gap-2 items-center">
			<button
				type="button"
				class="btn-base btn-primary px-4 py-2"
				onclick={() => goto(resolve('/'))}
			>
				Simple Mode
			</button>
			<ThemeToggle />
		</div>
	</div>

	<a href={resolve('/docs')} target="_blank" class="link-primary"> Tutorial & Docs </a>

	{#if authSettingsVisible}
		<TargetingAuthValidator />
	{/if}

	{#if guidedState.workflowStep === GuidedWorkflowStep.SELECTING_ROOT_FOLDER}
		<GuidedFolderSelector
			{guidedState}
			onDone={onFolderSelectionDone}
			class="w-full max-w-md mx-auto"
		/>
	{:else if guidedState.workflowStep === GuidedWorkflowStep.SELECTING_MANGA_FOLDERS}
		<MangaFolderSelector
			{guidedState}
			onDone={onMangaSelectionDone}
			class="w-full max-w-4xl mx-auto"
		/>
	{:else if guidedState.workflowStep === GuidedWorkflowStep.PROCESSING_MANGA}
		<div class="flex flex-col gap-4">
			<MangaProcessingTabs {guidedState} {onZipSelected} class="w-full" />

			{#if currentZipFile}
				<MangaProcessor
					{guidedState}
					zipFile={currentZipFile}
					{onProcessingComplete}
					class="w-full"
				/>
			{:else}
				<div class="bg-surface rounded-md p-4">
					<p class="text-muted">
						No zip file selected. Use the tabs above to select a zip file to process.
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
