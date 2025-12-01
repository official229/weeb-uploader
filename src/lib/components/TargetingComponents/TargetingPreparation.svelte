<script lang="ts">
	import { ChapterPageType, SelectedFolder, type SelectedFile } from '$lib/core/GroupedFolders';
	import TargetingGroupValidator from '$lib/components/TargetingComponents/TargetingGroupValidator.svelte';
	import TargetingSeriesValidator from '$lib/components/TargetingComponents/TargetingSeriesValidator.svelte';
	import TargetedChapterEditor from './TargetedChapterEditor.svelte';
	import {
		TargetingState,
		targetingStateContext,
		type ChapterComicInfoDefinitionFile
	} from './TargetingState.svelte';
	import { getContext } from 'svelte';
	import {
		ChapterPageState,
		ChapterPageStatus,
		ChapterState,
		ChapterStatus,
		ChapterUploadingGroup,
		ChapterUploadingSeries
	} from '$lib/core/UploadingState.svelte';
	import TargetingBatchEdit from './TargetingBatchEdit.svelte';
	import { XMLParser } from 'fast-xml-parser';
	import TargetingGroupSearch from './TargetingGroupSearch.svelte';
	import TargetingSeriesSearch from './TargetingSeriesSearch.svelte';

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

	let isAllready = $derived.by(() => targetingState.seriesId);

	async function createChapterFromDefinitionFile(
		definitionFile: SelectedFile,
		remainingFiles: SelectedFile[],
		folderPath: string
	): Promise<ChapterState> {
		let chapterTitle: string | null = null;
		let chapterNumber: string | null = null;
		let chapterVolume: string | null = null;

		// Check if this is a ComicInfo.xml file
		const isComicInfo = definitionFile.file.name.toLowerCase() === 'comicinfo.xml';

		if (isComicInfo) {
			try {
				const xmlText = await definitionFile.file.text();
				const parser = new XMLParser({
					ignoreAttributes: false,
					attributeNamePrefix: '@_',
					parseAttributeValue: true,
					trimValues: true
				});

				const parsed = parser.parse(xmlText) as ChapterComicInfoDefinitionFile;

				if (parsed.ComicInfo) {
					const comicInfo = parsed.ComicInfo;

					// Extract chapter title
					if (comicInfo.Title) {
						chapterTitle = comicInfo.Title;
					}

					// Extract chapter number
					if (comicInfo.Number !== undefined && comicInfo.Number !== null) {
						chapterNumber = String(comicInfo.Number);
					}

					// Extract volume
					if (comicInfo.Volume !== undefined && comicInfo.Volume !== null) {
						chapterVolume = String(comicInfo.Volume);
					}
				}
			} catch (error) {
				console.error('Failed to parse ComicInfo.xml:', error);
				// Continue with default values if parsing fails
			}
		}

		// Create pages from remaining files
		const pages = remainingFiles.map((file, pageIndex) => {
			const isFileAnImage = file.type === ChapterPageType.CHAPTER_PAGE;

			return new ChapterPageState(
				file.file.name,
				pageIndex,
				file.file,
				ChapterPageStatus.NOT_STARTED,
				0,
				null,
				null,
				!isFileAnImage,
				file.type
			);
		});

		const chapter = new ChapterState(
			folderPath,
			chapterTitle ?? '', // Default to empty title if none is found
			chapterVolume,
			chapterNumber,
			new ChapterUploadingSeries(),
			new ChapterUploadingGroup(),
			pages,
			ChapterStatus.NOT_STARTED,
			0,
			null,
			null,
			new SelectedFolder(folderPath, folderPath, [definitionFile, ...remainingFiles], [], 0, 0)
		);

		return chapter;
	}

	$effect(() => {
		(async () => {
			const chapters = await Promise.all(
				selectedFolders.map(async (folder, index) => {
					// If a folder contains a single definition file, we can use it to construct a chapter
					const definitionFiles = folder.files.filter(
						(file) => file.type === ChapterPageType.CHAPTER_DEFINITION_FILE
					);
					if (definitionFiles.length === 1) {
						const remainingFiles = folder.files.filter(
							(file) => file.type !== ChapterPageType.CHAPTER_DEFINITION_FILE
						);
						return await createChapterFromDefinitionFile(
							definitionFiles[0],
							remainingFiles,
							folder.path
						);
					}

					// For everything else, we just create a chapter from the files (and pretend unknown files are deleted)
					const pages = folder.files.map((file, pageIndex) => {
						const isFileAnImage = file.type === ChapterPageType.CHAPTER_PAGE;

						return new ChapterPageState(
							file.file.name,
							pageIndex,
							file.file,
							ChapterPageStatus.NOT_STARTED,
							0,
							null,
							null,
							!isFileAnImage,
							file.type
						);
					});

					return new ChapterState(
						folder.path,
						folder.name,
						null,
						index.toString(),
						new ChapterUploadingSeries(),
						new ChapterUploadingGroup(),
						pages
					);
				})
			);

			targetingState.chapterStates = chapters;
		})();
	});

	function sortChapters(chapters: ChapterState[]): ChapterState[] {
		return [...chapters].sort((a, b) => {
			// Sort by volume first (null volumes go last)
			const volumeA = a.chapterVolume;
			const volumeB = b.chapterVolume;

			if (volumeA === null && volumeB === null) {
				// Both null, continue to chapter number comparison
			} else if (volumeA === null) {
				return 1; // null goes after non-null
			} else if (volumeB === null) {
				return -1; // non-null goes before null
			} else {
				const volumeCompare = String(volumeA).localeCompare(String(volumeB), undefined, {
					numeric: true,
					sensitivity: 'base'
				});
				if (volumeCompare !== 0) {
					return volumeCompare;
				}
			}

			// Then sort by chapter number (null numbers go last)
			const numberA = a.chapterNumber;
			const numberB = b.chapterNumber;

			if (numberA === null && numberB === null) {
				return 0; // Both null, equal
			} else if (numberA === null) {
				return 1; // null goes after non-null
			} else if (numberB === null) {
				return -1; // non-null goes before null
			} else {
				return String(numberA).localeCompare(String(numberB), undefined, {
					numeric: true,
					sensitivity: 'base'
				});
			}
		});
	}

	$effect(() => {
		const sortAttempt = sortChapters(targetingState.chapterStates);

		// Only update on changes, comparing order
		for (let i = 0; i < sortAttempt.length; i++) {
			if (
				sortAttempt[i].originalFolderPath !== targetingState.chapterStates[i].originalFolderPath
			) {
				targetingState.chapterStates = sortAttempt;
				return;
			}
		}
	});

	$effect(() => {
		if (targetingState.seriesId !== null) {
			targetingState.chapterStates.forEach((chapter) => {
				if (!chapter.associatedSeries) {
					chapter.associatedSeries = new ChapterUploadingSeries();
				}

				chapter.associatedSeries.seriesId = targetingState.seriesId ?? '';
			});
		}
	});
</script>

<div>
	<div class="flex flex-col gap-2">
		<h2 class="text-xl font-semibold">Targeting Preparation (Required)</h2>
		<TargetingSeriesValidator />
		<TargetingSeriesSearch />
	</div>

	<div class="flex flex-col gap-2">
		<h2 class="text-xl font-semibold">Group Preparation</h2>
		<TargetingGroupValidator />
		<TargetingGroupSearch />
	</div>

	<div class="flex flex-col gap-2">
		<div class="flex flex-col gap-2">
			<h2 class="text-lg font-semibold">Batch Edit</h2>
			<TargetingBatchEdit bind:chapters={targetingState.chapterStates} />
		</div>

		<button
			type="button"
			class="cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-300 bg-blue-500 hover:bg-blue-600 text-white rounded-md px-2 py-1"
			onclick={onDone}
			disabled={!isAllready}
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
