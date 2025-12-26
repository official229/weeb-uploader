<script lang="ts">
	import { getContext, setContext } from 'svelte';
	import * as zip from '@zip.js/zip.js';
	import {
		groupFilesByFolders,
		type SelectedFolder,
		ChapterPageType
	} from '$lib/core/GroupedFolders';
	import {
		ChapterState,
		ChapterPageState,
		ChapterPageStatus,
		ChapterStatus,
		ChapterUploadingSeries,
		ChapterUploadingGroup
	} from '$lib/core/UploadingState.svelte';
	import {
		TargetingState,
		targetingStateContext
	} from '../TargetingComponents/TargetingState.svelte';
	import { apiAuthContext, ApiAuthContext } from '$lib/core/GlobalState.svelte';
	import { extractDeepestFolders, applyVolumeRegex, applyChapterRegex } from './guidedUtils';
	import TargetingSeriesSearch from '../TargetingComponents/TargetingSeriesSearch.svelte';
	import TargetingSeriesValidator from '../TargetingComponents/TargetingSeriesValidator.svelte';
	import SeriesChapterDumpLookup from '../TargetingComponents/SeriesChapterDumpLookup.svelte';
	import UploaderOrchestrator from '../UploaderComponents/UploaderOrchestrator.svelte';
	import type { GuidedState } from './GuidedState.svelte';
	import { MangaProcessingStatus } from './GuidedState.svelte';
	import { CHAPTER_TITLE_EXPORT_RESOLVER } from '$lib/core/ChapterTitleExportResolver.svelte';
	import {
		searchGroups,
		getMangaAggregate,
		getGroupById,
		type AggregateChapter
	} from '../TargetingComponents/TargetingState.svelte';
	import { ScanGroup } from '$lib/core/UploadingState.svelte';

	// Configure zip.js to disable web workers
	zip.configure({
		useWebWorkers: false
	});

	interface Props {
		guidedState: GuidedState;
		zipFile: File;
		class?: string;
		onProcessingComplete: () => void;
	}

	let { guidedState, zipFile, class: className = '', onProcessingComplete }: Props = $props();

	// Create a new TargetingState for this manga
	const targetingState = new TargetingState();
	setContext(targetingStateContext, targetingState);

	// Get auth context
	const authContext = getContext<ApiAuthContext>(apiAuthContext);
	if (!authContext) {
		throw new Error('MangaProcessor must be used within a component that provides ApiAuthContext');
	}

	let processingStep = $state<
		'loading' | 'extracting' | 'ready' | 'series_lookup' | 'uploading' | 'completed'
	>('loading');
	let groupedFolder = $state<SelectedFolder | null>(null);
	let chapters = $state<ChapterState[]>([]);
	let isUploading = $state(false);
	let uploadWorking = $state(false);
	let currentlyProcessingZip = $state<string | null>(null);
	let hasProcessedChapterDump = $state(false);
	let lastProcessedSeriesId = $state<string | null>(null);
	let hasCalledUploadDone = $state(false);
	let duplicateChapters = $state<Array<{ chapter: ChapterState; existingGroups: string[] }>>([]);

	const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'cbz', 'zip', 'xml'];

	// Load and process the zip file
	$effect(() => {
		if (zipFile) {
			hasProcessedChapterDump = false;
			lastProcessedSeriesId = null;
			duplicateChapters = [];
			processZipFile();
		}
	});

	/**
	 * Extracts an archive file (.cbz or .zip) and creates virtual File objects with fake paths
	 * to simulate a subfolder structure
	 */
	async function extractArchiveFile(archiveFile: File): Promise<File[]> {
		const archiveExtension = archiveFile.name.split('.').pop()?.toLowerCase();
		const isCbz = archiveExtension === 'cbz';
		const isZip = archiveExtension === 'zip';

		if (!isCbz && !isZip) {
			throw new Error(`Unsupported archive format: ${archiveExtension}`);
		}

		console.log(`Extracting ${archiveExtension} file:`, archiveFile.name);
		currentlyProcessingZip = archiveFile.name;
		const zipReader = new zip.ZipReader(new zip.BlobReader(archiveFile));
		const entries = await zipReader.getEntries();
		const extractedFiles: File[] = [];

		// Get the base name of the archive file (without extension) for the virtual folder
		const archiveBaseName = archiveFile.name.replace(/\.(cbz|zip)$/i, '');
		const originalPath = archiveFile.webkitRelativePath || archiveFile.name;

		for (const entry of entries) {
			if (!entry.filename || entry.directory) {
				continue;
			}

			// Check if the entry is an image file
			const entryExtension = entry.filename.split('.').pop()?.toLowerCase();
			if (!entryExtension || !allowedExtensions.includes(entryExtension)) {
				continue;
			}

			const entryStream = new TransformStream();
			const blobPromise = new Response(entryStream.readable).blob();

			await entry.getData(entryStream.writable);

			let blob = await blobPromise;

			if (!blob.type) {
				const mimeType = getMimeTypeFromExtension(entryExtension);
				blob = new Blob([blob], { type: mimeType });
			}

			const entryPath = entry.filename;
			const fileName = entryPath.split('/').pop() ?? entryPath;

			const virtualPath = originalPath.includes('/')
				? `${originalPath.split('/').slice(0, -1).join('/')}/${archiveBaseName}/${entryPath}`
				: `${archiveBaseName}/${entryPath}`;

			const virtualFile = new File([blob], fileName, {
				type: blob.type
			});

			Object.defineProperty(virtualFile, 'webkitRelativePath', {
				value: virtualPath,
				writable: false,
				enumerable: true,
				configurable: true
			});

			extractedFiles.push(virtualFile);
		}

		await zipReader.close();
		currentlyProcessingZip = null;

		return extractedFiles;
	}

	function getMimeTypeFromExtension(extension: string): string {
		const mimeMap: Record<string, string> = {
			jpg: 'image/jpeg',
			jpeg: 'image/jpeg',
			png: 'image/png',
			gif: 'image/gif',
			webp: 'image/webp'
		};
		return mimeMap[extension] || 'application/octet-stream';
	}

	async function processZipFile() {
		processingStep = 'loading';
		targetingState.reset();

		// Extract the zip file
		processingStep = 'extracting';
		let allExtractedFiles: File[] = [];
		try {
			allExtractedFiles = await extractArchiveFile(zipFile);
		} catch (error) {
			console.error(`Error extracting ${zipFile.name}:`, error);
			guidedState.setZipStatus(zipFile, MangaProcessingStatus.ERROR);
			return;
		}

		// Group files by folders
		groupedFolder = groupFilesByFolders(allExtractedFiles);

		// Find deepest level folders (these are the chapter folders)
		const deepestFolders = extractDeepestFolders(groupedFolder);

		// Create ChapterState objects from deepest folders
		processingStep = 'extracting';
		chapters = await Promise.all(
			deepestFolders.map(async (folder) => {
				// Apply regexes to extract volume and chapter numbers
				const volume = applyVolumeRegex(folder.name);
				const chapterNumber = applyChapterRegex(folder.name);

				// Create pages from folder files
				const pages = folder.files
					.filter((file) => file.type === ChapterPageType.CHAPTER_PAGE)
					.map((file, pageIndex) => {
						return new ChapterPageState(
							file.file.name,
							pageIndex,
							file.file,
							ChapterPageStatus.NOT_STARTED,
							0,
							null,
							null,
							false,
							file.type
						);
					});

				return new ChapterState(
					folder.path,
					folder.name, // Use folder name as default title
					volume,
					chapterNumber,
					new ChapterUploadingSeries(),
					new ChapterUploadingGroup(),
					pages,
					ChapterStatus.NOT_STARTED,
					0,
					null,
					null,
					folder,
					false,
					'en'
				);
			})
		);

		// Sort chapters by volume and chapter number
		chapters.sort((a, b) => {
			// Sort by volume first
			if (a.chapterVolume && b.chapterVolume) {
				const volCompare = String(a.chapterVolume).localeCompare(
					String(b.chapterVolume),
					undefined,
					{
						numeric: true,
						sensitivity: 'base'
					}
				);
				if (volCompare !== 0) return volCompare;
			} else if (a.chapterVolume) return -1;
			else if (b.chapterVolume) return 1;

			// Then by chapter number
			if (a.chapterNumber && b.chapterNumber) {
				return String(a.chapterNumber).localeCompare(String(b.chapterNumber), undefined, {
					numeric: true,
					sensitivity: 'base'
				});
			} else if (a.chapterNumber) return -1;
			else if (b.chapterNumber) return 1;

			return 0;
		});

		targetingState.chapterStates = chapters;
		processingStep = 'ready';
	}

	// Assign series ID to all chapters when it's set
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

	// Auto-apply groups and titles when series is loaded
	$effect(() => {
		if (
			targetingState.seriesId &&
			processingStep === 'ready' &&
			(!hasProcessedChapterDump || targetingState.seriesId !== lastProcessedSeriesId)
		) {
			hasProcessedChapterDump = true;
			lastProcessedSeriesId = targetingState.seriesId;
			processingStep = 'series_lookup';
			loadChapterDumpAndApply();
		}
	});

	async function loadChapterDumpAndApply() {
		if (!targetingState.seriesId) return;

		try {
			// Load chapter dump
			await CHAPTER_TITLE_EXPORT_RESOLVER.load();

			// Get all unique group names for this series
			const groupNames = await CHAPTER_TITLE_EXPORT_RESOLVER.getAllGroupNames(
				targetingState.seriesId
			);

			if (groupNames.length === 0) {
				console.warn('No groups found in chapter dump');
				return;
			}

			// Look up each group and add to availableScanGroups
			const availableGroups: ScanGroup[] = [];
			for (const groupName of groupNames) {
				try {
					const response = await searchGroups(groupName);
					if (response.data) {
						const exactMatch = response.data.find((g) => g.name === groupName);
						if (exactMatch) {
							const newGroup = new ScanGroup();
							newGroup.groupId = exactMatch.id;
							newGroup.groupName = exactMatch.name;
							availableGroups.push(newGroup);
						}
					}
				} catch (err) {
					console.warn(`Failed to lookup group "${groupName}":`, err);
				}
			}

			targetingState.availableScanGroups = availableGroups;

			// Apply groups to chapters
			await applyGroupsToChapters();

			// Apply titles to chapters
			await applyTitlesToChapters();

			// Check for duplicate chapters
			await checkForDuplicates();

			// Return to ready state so user can start upload
			processingStep = 'ready';
		} catch (err) {
			console.error('Error loading chapter dump:', err);
			processingStep = 'ready';
		}
	}

	async function applyGroupsToChapters() {
		for (const chapter of targetingState.chapterStates) {
			if (!chapter.originalFolderPath) continue;

			const matchingGroups = targetingState.availableScanGroups.filter((group) => {
				return chapter.originalFolderPath?.includes(group.groupName) ?? false;
			});

			if (matchingGroups.length > 0) {
				const existingGroupIds = chapter.associatedGroup.groupIds ?? [];
				const existingSet = new Set(existingGroupIds);

				for (const group of matchingGroups) {
					if (!existingSet.has(group.groupId)) {
						existingSet.add(group.groupId);
					}
				}

				chapter.associatedGroup.groupIds = Array.from(existingSet);
			}
		}
	}

	async function applyTitlesToChapters() {
		if (!targetingState.seriesId) return;

		const groupIdToNameMap = new Map<string, string>();
		for (const group of targetingState.availableScanGroups) {
			groupIdToNameMap.set(group.groupId, group.groupName);
		}

		for (const chapter of targetingState.chapterStates) {
			const assignedGroupIds = chapter.associatedGroup.groupIds ?? [];
			if (assignedGroupIds.length === 0) continue;

			const assignedGroupNames = assignedGroupIds
				.map((id) => groupIdToNameMap.get(id))
				.filter((name): name is string => name !== undefined);

			if (assignedGroupNames.length === 0) continue;

			const chapterInfo = await CHAPTER_TITLE_EXPORT_RESOLVER.getChapterInfo(
				targetingState.seriesId,
				chapter.chapterVolume,
				chapter.chapterNumber
			);

			if (!chapterInfo || !chapterInfo.title) continue;

			const hasMatchingGroup = assignedGroupNames.some((name) =>
				chapterInfo.groupNames.includes(name)
			);

			if (hasMatchingGroup) {
				chapter.chapterTitle = chapterInfo.title;
			}
		}
	}

	async function checkForDuplicates() {
		if (!targetingState.seriesId) return;

		try {
			const aggregate = await getMangaAggregate(targetingState.seriesId);
			const duplicates: Array<{ chapter: ChapterState; existingGroups: string[] }> = [];

			// Build a map of existing chapters from aggregate data
			// Key format: "volume:chapter" (e.g., "3:18" or "none:18.5")
			const existingChapters = new Map<string, AggregateChapter>();
			for (const aggregateChapter of aggregate.chapters) {
				const volume = aggregateChapter.volume || 'none';
				const chapterNum = aggregateChapter.chapter;
				const key = `${volume}:${chapterNum}`;
				existingChapters.set(key, aggregateChapter);
			}

			// Check each chapter for duplicates
			for (const chapter of targetingState.chapterStates) {
				const volume = chapter.chapterVolume || 'none';
				const chapterNum = chapter.chapterNumber;
				if (!chapterNum) continue;

				const key = `${volume}:${chapterNum}`;
				const existingChapter = existingChapters.get(key);

				if (
					existingChapter &&
					existingChapter.entries &&
					Object.keys(existingChapter.entries).length > 0
				) {
					// Collect all group indices from all entries for this chapter
					const existingGroupIndices = new Set<number>();
					for (const entry of Object.values(existingChapter.entries)) {
						for (const groupIndex of entry.groups) {
							existingGroupIndices.add(groupIndex);
						}
					}

					// Get our chapter's group IDs
					const chapterGroupIds = chapter.associatedGroup.groupIds ?? [];

					// Look up actual group IDs and names from the groups array using indices
					const existingGroupNames: string[] = [];
					for (const groupIndex of existingGroupIndices) {
						// The groupIndex is an index into the aggregate.groups array
						if (aggregate.groups && aggregate.groups[groupIndex]) {
							const group = aggregate.groups[groupIndex];
							existingGroupNames.push(`${group.name} (${group.id})`);
						} else {
							existingGroupNames.push(`Unknown Group (index: ${groupIndex})`);
						}
					}

					// Check if any of our chapter's groups match the existing groups
					const hasMatchingGroup = chapterGroupIds.some((chapterGroupId) => {
						// Check if this group ID matches any of the existing groups
						return aggregate.groups?.some((group) => group.id === chapterGroupId) ?? false;
					});

					// If chapter exists, show it as a duplicate
					duplicates.push({
						chapter,
						existingGroups: existingGroupNames.length > 0 ? existingGroupNames : ['Unknown groups']
					});
				}
			}

			duplicateChapters = duplicates;
		} catch (err) {
			console.error('Error checking for duplicates:', err);
			duplicateChapters = [];
		}
	}

	function handleUploadDone() {
		if (hasCalledUploadDone) return; // Prevent multiple calls
		hasCalledUploadDone = true;
		isUploading = false;
		processingStep = 'completed';
		guidedState.setZipStatus(zipFile, MangaProcessingStatus.COMPLETED);
		onProcessingComplete();
	}

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

		processingStep = 'uploading';
		isUploading = true;
		hasCalledUploadDone = false; // Reset flag when starting new upload
		guidedState.setZipStatus(zipFile, MangaProcessingStatus.PROCESSING);
	}

	const canStartUpload = $derived(processingStep === 'ready' || processingStep === 'series_lookup');
	const nonDeletedChapters = $derived(chapters.filter((ch) => !ch.isDeleted));

	// Watch for all chapters to be completed and mark zip as completed
	$effect(() => {
		if (processingStep === 'uploading' && chapters.length > 0) {
			const allCompleted = chapters.every(
				(chapter) => chapter.status === ChapterStatus.COMPLETED || chapter.isDeleted
			);
			const hasNonDeletedChapters = chapters.some((chapter) => !chapter.isDeleted);

			if (allCompleted && hasNonDeletedChapters && !isUploading) {
				// All chapters are completed, mark zip as completed
				guidedState.setZipStatus(zipFile, MangaProcessingStatus.COMPLETED);
				handleUploadDone();
			}
		}
	});
</script>

<div class="flex flex-col gap-4 {className}">
	<h2 class="text-2xl font-bold text-app">Processing: {zipFile.name}</h2>

	{#if processingStep === 'loading' || processingStep === 'extracting'}
		<div class="flex flex-col gap-2 items-center">
			<div class="animate-spin rounded-full h-8 w-8 outline-dotted outline-5 border-surface"></div>
			<p class="text-sm text-muted">
				{processingStep === 'loading' ? 'Loading manga folder...' : 'Extracting zip files...'}
			</p>
			{#if currentlyProcessingZip}
				<p class="text-xs text-muted">Processing: {currentlyProcessingZip}</p>
			{/if}
		</div>
	{:else if processingStep === 'ready' || processingStep === 'series_lookup'}
		<div class="flex flex-col gap-4">
			<div class="bg-surface rounded-md p-4">
				<p class="text-sm text-app">
					Found {chapters.length} chapter{chapters.length === 1 ? '' : 's'} from deepest folders
				</p>
			</div>

			<div class="flex flex-col gap-2">
				<h3 class="text-lg font-semibold text-app">Series Selection (Required)</h3>
				<TargetingSeriesValidator />
				<SeriesChapterDumpLookup />
				<TargetingSeriesSearch />
			</div>

			{#if processingStep === 'series_lookup'}
				<div class="flex flex-col gap-2">
					<p class="text-sm text-muted">Loading chapter dump and applying groups/titles...</p>
				</div>
			{/if}

			<!-- Duplicate Warning -->
			{#if duplicateChapters.length > 0}
				<div
					class="flex flex-col gap-2 bg-yellow-500/20 dark:bg-yellow-500/10 border-1 border-yellow-500 rounded-md p-4"
				>
					<div class="flex flex-row justify-between items-center">
						<div class="flex flex-col gap-1">
							<p class="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
								⚠️ Warning: {duplicateChapters.length} duplicate chapter{duplicateChapters.length ===
								1
									? ''
									: 's'} detected
							</p>
							<p class="text-xs text-yellow-700 dark:text-yellow-300">
								The following chapters already exist on WeebDex with matching groups. You can mark
								them as removed to skip uploading.
							</p>
						</div>
						<button
							type="button"
							class="btn-base btn-neutral px-3 py-1 text-sm"
							onclick={() => {
								for (const { chapter } of duplicateChapters) {
									chapter.isDeleted = true;
								}
							}}
							title="Mark all duplicate chapters as removed"
						>
							Removed duplicate chapters
						</button>
					</div>
					<div class="flex flex-col gap-1 mt-1 max-h-48 overflow-y-auto">
						{#each duplicateChapters as { chapter, existingGroups }}
							<div
								class="flex flex-row gap-2 items-start text-xs text-yellow-700 dark:text-yellow-300 border-l-2 border-yellow-500 pl-2 {chapter.isDeleted
									? 'opacity-50'
									: ''}"
							>
								<div class="flex-1 flex flex-col gap-1">
									<div class="flex flex-row gap-2 items-center">
										<p class="font-medium">
											Vol. {chapter.chapterVolume ?? 'N/A'} Ch. {chapter.chapterNumber ?? 'N/A'} - {chapter.chapterTitle ||
												chapter.originalFolderPath ||
												'Untitled'}
										</p>
										{#if chapter.isDeleted}
											<span
												class="px-2 py-0.5 rounded text-xs font-semibold bg-gray-500 text-white"
											>
												Removed
											</span>
										{/if}
									</div>
									<p class="text-xs opacity-75">
										Existing groups: {existingGroups.join(', ')}
									</p>
								</div>
								<button
									type="button"
									class="clickable-hint rounded-md px-2 py-1 text-xs {chapter.isDeleted
										? 'btn-success'
										: 'btn-danger'}"
									onclick={() => {
										chapter.isDeleted = !chapter.isDeleted;
									}}
									title={chapter.isDeleted ? 'Restore chapter' : 'Mark as removed'}
								>
									{#if chapter.isDeleted}
										<div class="i-mdi-restore h-4 w-4"></div>
									{:else}
										<div class="i-mdi-delete h-4 w-4"></div>
									{/if}
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Chapter List -->
			<div class="flex flex-col gap-2">
				<h3 class="text-lg font-semibold text-app">Detected Chapters</h3>
				<div class="flex flex-col gap-2 max-h-150 overflow-y-auto">
					{#each chapters as chapter, index}
						<div
							class="bg-surface-hover rounded-md p-3 flex flex-col gap-2 {chapter.isDeleted
								? 'opacity-50 border-2 border-red-500/50'
								: ''}"
						>
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
							<div class="flex flex-row gap-2 items-center">
								<span class="text-xs text-muted">Title:</span>
								<span class="text-sm text-app font-medium">
									{chapter.chapterTitle || chapter.originalFolderPath || 'Untitled'}
								</span>
							</div>
							<div class="flex flex-row gap-2 items-center">
								<span class="text-xs text-muted">Groups:</span>
								{#if chapter.associatedGroup.groupIds && chapter.associatedGroup.groupIds.length > 0}
									<div class="flex flex-row gap-1 flex-wrap">
										{#each chapter.associatedGroup.groupIds as groupId}
											{@const group = targetingState.availableScanGroups.find(
												(g) => g.groupId === groupId
											)}
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
								<span class="text-xs text-muted font-mono truncate"
									>{chapter.originalFolderPath}</span
								>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<button
				type="button"
				class="btn-primary w-full px-6 py-3 font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
				disabled={!canStartUpload || !targetingState.seriesId || nonDeletedChapters.length === 0}
				onclick={startUpload}
			>
				Start Upload ({nonDeletedChapters.length} of {chapters.length} chapters)
			</button>
		</div>
	{:else if processingStep === 'uploading'}
		<UploaderOrchestrator onDone={handleUploadDone} bind:busy={uploadWorking} />
	{:else if processingStep === 'completed'}
		<div class="bg-green-500/20 dark:bg-green-500/10 border-1 border-green-500 rounded-md p-4">
			<p class="text-sm font-semibold text-green-600 dark:text-green-400">
				✓ Upload completed successfully!
			</p>
		</div>
	{/if}
</div>
