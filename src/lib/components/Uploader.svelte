<script lang="ts">
	import type { SelectedFolder } from '$lib/core/GroupedFolders';
	import ApiAuthSetup from './ApiAuthSetup.svelte';
	import ChapterList from './ChapterList.svelte';
	import SeriesSetter from './SeriesSetter.svelte';
	import { GlobalState, globalStateContext } from '$lib/core/GlobalState.svelte';
	import {
		ChapterState,
		ChapterPageState,
		ChapterUploadingSeries,
		ChapterUploadingGroup,
		ChapterPageStatus,
		ChapterStatus
	} from '$lib/core/UploadingState.svelte';
	import { getContext } from 'svelte';
	import { getFolderPath } from '$lib/core/GroupedFolders';

	const globalState = getContext(globalStateContext) as GlobalState;

	interface GroupedData {
		name: string;
		nameFolder: SelectedFolder;
		files: Array<{ file: SelectedFolder['files'][0]; folder: SelectedFolder }>;
	}

	interface Props {
		groups: GroupedData[];
		rootFolder?: SelectedFolder;
	}

	let { groups: initialGroups, rootFolder }: Props = $props();

	// Shared series and group instances
	const sharedSeries = new ChapterUploadingSeries();
	const sharedGroup = new ChapterUploadingGroup();

	// Convert GroupedData to ChapterState
	function convertGroupsToChapters(groups: GroupedData[]): ChapterState[] {
		return groups.map((group, index) => {
			// Get folder name - use the name from the group or try to get path
			const folderName = rootFolder
				? (getFolderPath(rootFolder, group.nameFolder) ?? group.name)
				: group.name;

			// Sort files by name for consistent ordering
			const sortedFiles = [...group.files].sort((a, b) =>
				a.file.file.name.localeCompare(b.file.file.name, undefined, {
					numeric: true,
					sensitivity: 'base'
				})
			);

			// Create pages from files
			const pages = sortedFiles.map((fileItem, pageIndex) => {
				return new ChapterPageState(
					fileItem.file.file.name,
					pageIndex,
					fileItem.file.file,
					ChapterPageStatus.NOT_STARTED,
					0,
					null
				);
			});

			// Create chapter with default values
			return new ChapterState(
				folderName, // originalFolderName
				folderName, // chapterTitle (defaults to folder name)
				null, // chapterVolume (defaults to null)
				index + 1, // chapterNumber (sequential index, 1-based)
				sharedSeries,
				sharedGroup,
				pages,
				ChapterStatus.NOT_STARTED,
				0
			);
		});
	}

	// Initialize chapters in global state and sync when initialGroups changes
	let previousGroupsRef = $state<GroupedData[] | null>(null);

	$effect(() => {
		// Only recreate if initialGroups is a different reference (new selection from parent)
		if (previousGroupsRef !== initialGroups) {
			const newChapters = convertGroupsToChapters(initialGroups);
			globalState.chapterStates = newChapters;
			previousGroupsRef = initialGroups;
		}
	});

	// Sync series ID with shared series instance
	$effect(() => {
		if (globalState.seriesId) {
			sharedSeries.seriesId = globalState.seriesId;
		}
	});
</script>

<div class="space-y-6">
	<ApiAuthSetup />

	{#if globalState.apiToken}
		<SeriesSetter />
	{/if}

	<ChapterList {rootFolder} />
</div>
