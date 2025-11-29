<script lang="ts">
	import FolderSelector from '$lib/components/FolderSelectorComponents/FolderSelector.svelte';
	import VerticalSlice from '$lib/components/VerticalSlicerComponents/VerticalSlice.svelte';
	import type { SelectedFolder } from '$lib/core/GroupedFolders';

	let selectedFiles = $state<File[] | null>(null);
	let finalizedFolderSelection = $state<SelectedFolder[] | null>(null);

	enum EDITOR_STATE {
		PICKING_FOLDER = 'PICKING_FOLDER',
		SELECTING_FOLDERS = 'SELECTING_FOLDERS',
		EDITING_CHAPTERS = 'EDITING_CHAPTERS',
		UPLOADING = 'UPLOADING'
	}

	$effect(() => {
		if (selectedFiles) {
			editorState = EDITOR_STATE.SELECTING_FOLDERS;
		}
	});

	let editorState = $state<EDITOR_STATE>(EDITOR_STATE.PICKING_FOLDER);

	function switchEditorState(state: EDITOR_STATE) {
		if (selectedFiles) editorState = state;
	}
</script>

<div class="container mx-auto p-6 flex flex-col gap-6">
	<h1 class="text-xl font-bold">Uploader Improved</h1>

	<a href="/docs" class="text-blue-500 hover:text-blue-600">Tutorial & Docs</a>

	<div class="flex flex-row gap-4">
		<button
			type="button"
			class={{
				'cursor-pointer hover:bg-gray-200 disabled:cursor-not-allowed p-2 rounded-md': true,
				'bg-gray-300': editorState !== EDITOR_STATE.PICKING_FOLDER,
				'bg-gray-400 hover:bg-gray-300': editorState === EDITOR_STATE.PICKING_FOLDER
			}}
			onclick={() => switchEditorState(EDITOR_STATE.PICKING_FOLDER)}
		>
			Pick Folder
		</button>
		<button
			type="button"
			class={{
				'cursor-pointer hover:bg-gray-200 disabled:cursor-not-allowed p-2 rounded-md': true,
				'bg-gray-300 disabled:bg-gray-200': editorState !== EDITOR_STATE.SELECTING_FOLDERS,
				'bg-gray-400 hover:bg-gray-300': editorState === EDITOR_STATE.SELECTING_FOLDERS
			}}
			disabled={!selectedFiles}
			onclick={() => switchEditorState(EDITOR_STATE.SELECTING_FOLDERS)}>Select Folders</button
		>
		<button
			type="button"
			class={{
				'cursor-pointer hover:bg-gray-200 disabled:cursor-not-allowed p-2 rounded-md': true,
				'bg-gray-300 disabled:bg-gray-200': editorState !== EDITOR_STATE.EDITING_CHAPTERS,
				'bg-gray-400 hover:bg-gray-300': editorState === EDITOR_STATE.EDITING_CHAPTERS
			}}
			disabled={!finalizedFolderSelection}
			onclick={() => switchEditorState(EDITOR_STATE.EDITING_CHAPTERS)}>Edit Chapters</button
		>
		<button
			type="button"
			class={{
				'cursor-pointer hover:bg-gray-200 disabled:cursor-not-allowed p-2 rounded-md': true,
				'bg-gray-300 disabled:bg-gray-200': editorState !== EDITOR_STATE.UPLOADING,
				'bg-gray-400 hover:bg-gray-300': editorState === EDITOR_STATE.UPLOADING
			}}
			onclick={() => switchEditorState(EDITOR_STATE.UPLOADING)}>Upload</button
		>
	</div>

	{#if editorState === EDITOR_STATE.PICKING_FOLDER}
		<FolderSelector bind:selectedFiles class="w-full max-w-md mx-auto" />
	{:else if editorState === EDITOR_STATE.SELECTING_FOLDERS}
		<VerticalSlice {selectedFiles} bind:finalizedFolderSelection />
	{:else if editorState === EDITOR_STATE.EDITING_CHAPTERS}
		<p>todo: editing chapters</p>
	{:else if editorState === EDITOR_STATE.UPLOADING}
		<p>todo: uploading</p>
	{/if}
</div>
