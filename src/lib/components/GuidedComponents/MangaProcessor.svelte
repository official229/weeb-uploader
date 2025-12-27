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
	import {
		extractDeepestFolders,
		applyVolumeRegex,
		applyChapterRegex,
		extractMangaDexIdFromZipName
	} from './guidedUtils';
	import TargetingSeriesSearch from '../TargetingComponents/TargetingSeriesSearch.svelte';
	import TargetingSeriesValidator from '../TargetingComponents/TargetingSeriesValidator.svelte';
	import SeriesChapterDumpLookup from '../TargetingComponents/SeriesChapterDumpLookup.svelte';
	import UploaderOrchestrator from '../UploaderComponents/UploaderOrchestrator.svelte';
	import type { GuidedState } from './GuidedState.svelte';
	import {
		MangaProcessingStatus,
		MangaProcessingStep,
		AutomationState,
		automationStateContext
	} from './GuidedState.svelte';
	import { CHAPTER_TITLE_EXPORT_RESOLVER } from '$lib/core/ChapterTitleExportResolver.svelte';
	import {
		searchGroups,
		getMangaAggregate,
		getGroupById,
		type AggregateChapter,
		type AggregateChapterEntry
	} from '../TargetingComponents/TargetingState.svelte';
	import { ScanGroup } from '$lib/core/UploadingState.svelte';
	import GuidedChapterEditor from './GuidedChapterEditor.svelte';
	import { LEGACY_ID_RESOLVER } from '$lib/core/LegacyIdResolver.svelte';

	// Configure zip.js to disable web workers
	zip.configure({
		useWebWorkers: false
	});

	export type ProcessingStatus = 'success' | 'warning' | 'error';

	interface Props {
		guidedState: GuidedState;
		zipFile: File;
		class?: string;
		onProcessingComplete: (status: ProcessingStatus) => void;
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

	// Get automation state (optional - automation may not be enabled)
	const automationState = getContext<AutomationState>(automationStateContext);

	let processingStep = $state<MangaProcessingStep>(MangaProcessingStep.LOADING);
	let groupedFolder = $state<SelectedFolder | null>(null);
	let chapters = $state<ChapterState[]>([]);
	let uploadWorking = $state(false);
	let currentlyProcessingZip = $state<string | null>(null);
	let uploaderOrchestratorRef = $state<{ startUpload: () => void } | null>(null);
	let lastProcessedSeriesId = $state<string | null>(null);
	let duplicateChapters = $state<Array<{ chapter: ChapterState; existingGroups: string[] }>>([]);
	let dumpLookupFailed = $state(false);
	let dumpLookupFailedGroups = $state<string[]>([]);
	let dumpLookupFailedTitles = $state<number>(0);
	let extractionError = $state<string | null>(null);

	const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'cbz', 'zip', 'xml'];

	// Load and process the zip file
	$effect(() => {
		if (zipFile) {
			lastProcessedSeriesId = null;
			duplicateChapters = [];
			dumpLookupFailed = false;
			dumpLookupFailedGroups = [];
			dumpLookupFailedTitles = 0;
			extractionError = null;
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
		processingStep = MangaProcessingStep.LOADING;
		targetingState.reset();

		// Try to automatically detect series ID from MD-#### in zip file name
		const mangaDexId = extractMangaDexIdFromZipName(zipFile.name);
		if (mangaDexId) {
			try {
				await LEGACY_ID_RESOLVER.load();
				const weebdexId = await LEGACY_ID_RESOLVER.getWeebdexIdFromLegacyId(mangaDexId);
				if (weebdexId) {
					targetingState.seriesId = weebdexId;
					console.log(`Auto-detected series ID from MD-####: ${mangaDexId} -> ${weebdexId}`);
				} else {
					console.log(`No WeebDex ID found for MangaDex ID: ${mangaDexId}`);
				}
			} catch (error) {
				console.warn(`Failed to lookup WeebDex ID for MangaDex ID ${mangaDexId}:`, error);
			}
		}

		// Extract the zip file
		processingStep = MangaProcessingStep.EXTRACTING;
		let allExtractedFiles: File[] = [];
		try {
			allExtractedFiles = await extractArchiveFile(zipFile);
		} catch (error) {
			console.error(`Error extracting ${zipFile.name}:`, error);
			extractionError = error instanceof Error ? error.message : 'Failed to extract archive';
			guidedState.setZipStatus(zipFile, MangaProcessingStatus.ERROR);
			processingStep = MangaProcessingStep.READY;
			onProcessingComplete('error');
			return;
		}

		// Group files by folders
		groupedFolder = groupFilesByFolders(allExtractedFiles);

		// Find deepest level folders (these are the chapter folders)
		const deepestFolders = extractDeepestFolders(groupedFolder);

		// Create ChapterState objects from deepest folders
		processingStep = MangaProcessingStep.EXTRACTING;
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
		processingStep = MangaProcessingStep.READY;
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
			(processingStep === MangaProcessingStep.READY ||
				processingStep === MangaProcessingStep.READY_WARNING) &&
			targetingState.seriesId !== lastProcessedSeriesId
		) {
			lastProcessedSeriesId = targetingState.seriesId;
			processingStep = MangaProcessingStep.SERIES_LOOKUP;
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
				dumpLookupFailed = true;
				processingStep = MangaProcessingStep.READY_WARNING;
				return;
			}

			// Look up each group and add to availableScanGroups
			const availableGroups: ScanGroup[] = [];
			const failedGroups: string[] = [];
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
						} else {
							failedGroups.push(groupName);
						}
					} else {
						failedGroups.push(groupName);
					}
				} catch (err) {
					console.warn(`Failed to lookup group "${groupName}":`, err);
					failedGroups.push(groupName);
				}
			}

			dumpLookupFailedGroups = failedGroups;
			if (failedGroups.length > 0) {
				dumpLookupFailed = true;
			}

			targetingState.availableScanGroups = availableGroups;

			// Apply groups to chapters
			await applyGroupsToChapters();

			// Apply titles to chapters
			const failedTitleCount = await applyTitlesToChapters();
			dumpLookupFailedTitles = failedTitleCount;
			if (failedTitleCount > 0) {
				dumpLookupFailed = true;
			}

			// Check for duplicate chapters
			await checkForDuplicates();

			// Determine final state based on whether there are issues
			if (hasIssues()) {
				processingStep = MangaProcessingStep.READY_WARNING;
			} else {
				processingStep = MangaProcessingStep.READY;
			}
		} catch (err) {
			console.error('Error loading chapter dump:', err);
			dumpLookupFailed = true;
			processingStep = MangaProcessingStep.READY_WARNING;
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

	async function applyTitlesToChapters(): Promise<number> {
		if (!targetingState.seriesId) return 0;

		const groupIdToNameMap = new Map<string, string>();
		for (const group of targetingState.availableScanGroups) {
			groupIdToNameMap.set(group.groupId, group.groupName);
		}

		let failedCount = 0;
		for (const chapter of targetingState.chapterStates) {
			const assignedGroupIds = chapter.associatedGroup.groupIds ?? [];
			if (assignedGroupIds.length === 0) {
				failedCount++;
				continue;
			}

			const assignedGroupNames = assignedGroupIds
				.map((id) => groupIdToNameMap.get(id))
				.filter((name): name is string => name !== undefined);

			if (assignedGroupNames.length === 0) {
				failedCount++;
				continue;
			}

			const chapterInfo = await CHAPTER_TITLE_EXPORT_RESOLVER.getChapterInfo(
				targetingState.seriesId,
				chapter.chapterVolume,
				chapter.chapterNumber
			);

			if (!chapterInfo) {
				failedCount++;
				continue;
			}

			const hasMatchingGroup = assignedGroupNames.some((name) =>
				chapterInfo.groupNames.includes(name)
			);

			if (hasMatchingGroup) {
				chapter.chapterTitle = chapterInfo.title;
			} else {
				failedCount++;
			}
		}

		return failedCount;
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

			// Helper function to convert group indices to group IDs
			const getGroupIdsFromIndices = (groupIndices: number[]): Set<string> => {
				const groupIds = new Set<string>();
				if (aggregate.groups) {
					for (const groupIndex of groupIndices) {
						const group = aggregate.groups[groupIndex];
						if (group) {
							groupIds.add(group.id);
						}
					}
				}
				return groupIds;
			};

			// Helper function to check if two sets of group IDs are equal
			const areGroupSetsEqual = (set1: Set<string>, set2: Set<string>): boolean => {
				if (set1.size !== set2.size) return false;
				for (const id of set1) {
					if (!set2.has(id)) return false;
				}
				return true;
			};

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
					// Get the group IDs for the chapter being uploaded
					const uploadingGroupIds = new Set(chapter.associatedGroup.groupIds ?? []);

					// If no groups are assigned, skip duplicate check (can't match without groups)
					if (uploadingGroupIds.size === 0) continue;

					// Check each entry to see if it has the same group combination
					let matchingEntry: AggregateChapterEntry | null = null;
					for (const entry of Object.values(existingChapter.entries)) {
						const entryGroupIds = getGroupIdsFromIndices(entry.groups);
						if (areGroupSetsEqual(uploadingGroupIds, entryGroupIds)) {
							matchingEntry = entry;
							break;
						}
					}

					// Only mark as duplicate if we found an entry with the exact same group combination
					if (matchingEntry) {
						// Get group names for display
						const matchingGroupIds = getGroupIdsFromIndices(matchingEntry.groups);
						const existingGroupNames: string[] = [];
						for (const groupId of matchingGroupIds) {
							const group = aggregate.groups?.find((g) => g.id === groupId);
							if (group) {
								existingGroupNames.push(`${group.name} (${group.id})`);
							} else {
								existingGroupNames.push(`Unknown Group (${groupId})`);
							}
						}

						duplicates.push({
							chapter,
							existingGroups:
								existingGroupNames.length > 0 ? existingGroupNames : ['Unknown groups']
						});
					}
				}
			}

			duplicateChapters = duplicates;
		} catch (err) {
			console.error('Error checking for duplicates:', err);
			duplicateChapters = [];
		}
	}

	function handleUploadDone(success: boolean) {
		// Prevent multiple calls - only process if we're still uploading
		if (processingStep !== MangaProcessingStep.UPLOADING) return;

		processingStep = MangaProcessingStep.COMPLETED;
		const status: ProcessingStatus = success ? 'success' : 'error';
		guidedState.setZipStatus(
			zipFile,
			success ? MangaProcessingStatus.COMPLETED : MangaProcessingStatus.ERROR
		);
		onProcessingComplete(status);
	}

	// Check if there are any issues that should mark this as a warning
	export function hasIssues(): boolean {
		return (
			duplicateChapters.length > 0 ||
			dumpLookupFailed ||
			dumpLookupFailedGroups.length > 0 ||
			dumpLookupFailedTitles > 0
		);
	}

	// Expose issue details for automation
	export function getIssueDetails() {
		return {
			hasDuplicates: duplicateChapters.length > 0,
			duplicateCount: duplicateChapters.length,
			dumpLookupFailed,
			failedGroups: dumpLookupFailedGroups.length,
			failedTitles: dumpLookupFailedTitles
		};
	}

	// Expose ready state for automation
	// Only returns true for READY (no issues), not READY_WARNING (has issues)
	export function isReady(): boolean {
		// Ready if:
		// 1. Processing step is READY (not READY_WARNING, loading, extracting, uploading, or series lookup)
		// 2. Either we've processed the dump for this series ID OR no series ID is set (meaning dump won't be processed)
		//    We've processed it if lastProcessedSeriesId matches current seriesId
		return (
			processingStep === MangaProcessingStep.READY &&
			(lastProcessedSeriesId === targetingState.seriesId || !targetingState.seriesId)
		);
	}

	// Automation logic: check and progress automatically
	// Track all dependencies explicitly to ensure reactivity
	$effect(() => {
		const isActive = automationState?.isActive;
		if (!isActive) return;

		// Track the state values that determine if we're ready
		const step = processingStep;
		const seriesId = targetingState.seriesId;
		const lastSeriesId = lastProcessedSeriesId;

		// Check if we should trigger automation check
		// Either READY (no issues) or READY_WARNING (has issues - automation will skip)
		const shouldCheck =
			(step === MangaProcessingStep.READY && (lastSeriesId === seriesId || !seriesId)) ||
			step === MangaProcessingStep.READY_WARNING;

		if (!shouldCheck) return;

		console.log('Automation: Effect triggered, checking state', {
			step,
			seriesId,
			lastSeriesId,
			shouldCheck
		});

		// Small delay to ensure state is stable
		const timeoutId = setTimeout(() => {
			handleAutomationCheck();
		}, 500);

		return () => clearTimeout(timeoutId);
	});

	async function handleAutomationCheck() {
		if (!automationState?.isActive) {
			console.log('Automation: Not active');
			return;
		}

		// Check if we're in READY_WARNING state - automation should skip these
		if (processingStep === MangaProcessingStep.READY_WARNING) {
			console.log('Automation: READY_WARNING state detected, marking as warning and skipping');
			guidedState.setZipStatus(zipFile, MangaProcessingStatus.WARNING);
			onProcessingComplete('warning');
			return;
		}

		if (!isReady()) {
			console.log('Automation: Not ready', {
				step: processingStep,
				seriesId: targetingState.seriesId,
				lastProcessedSeriesId
			});
			return;
		}

		console.log('Automation: Checking zip file', zipFile.name);

		// Check if we should stop automation (only warnings/errors remain)
		const pendingZips = guidedState.pendingZips;
		const hasWarningsOrErrors =
			guidedState.warningZips.length > 0 || guidedState.errorZips.length > 0;

		if (pendingZips.length === 0 && hasWarningsOrErrors) {
			console.log('Automation: Disabling - only warnings/errors remain');
			automationState.disable();
			return;
		}

		// At this point we're in READY state (no issues), so we can proceed with upload
		console.log('Automation: No issues, starting upload', {
			canStartUpload,
			hasSeriesId: !!targetingState.seriesId,
			nonDeletedChapters: nonDeletedChapters.length
		});

		if (canStartUpload && targetingState.seriesId && nonDeletedChapters.length > 0) {
			const uploadStarted = startUpload();
			if (!uploadStarted) {
				// If upload couldn't start, mark as error and move on
				console.warn('Automation: Failed to start upload, marking as error');
				guidedState.setZipStatus(zipFile, MangaProcessingStatus.ERROR);
				onProcessingComplete('error');
			} else {
				console.log('Automation: Upload started successfully');
			}
		} else {
			// Missing requirements - mark as warning
			console.warn('Automation: Missing requirements for upload', {
				canStartUpload,
				hasSeriesId: !!targetingState.seriesId,
				nonDeletedChapters: nonDeletedChapters.length
			});
			guidedState.setZipStatus(zipFile, MangaProcessingStatus.WARNING);
			onProcessingComplete('warning');
		}
	}

	export function startUpload() {
		if (!authContext.apiToken) {
			alert('Please set up API authentication first');
			return false;
		}

		if (!targetingState.seriesId) {
			alert('Please set a series ID first');
			return false;
		}

		if (targetingState.chapterStates.length === 0) {
			alert('No chapters to upload');
			return false;
		}

		if (!canStartUpload || nonDeletedChapters.length === 0) {
			return false;
		}

		processingStep = MangaProcessingStep.UPLOADING;
		guidedState.setZipStatus(zipFile, MangaProcessingStatus.PROCESSING);
		return true;
	}

	// Watch for UPLOADING state and trigger upload if automation is active
	$effect(() => {
		if (
			processingStep === MangaProcessingStep.UPLOADING &&
			automationState?.isActive &&
			uploaderOrchestratorRef
		) {
			// Small delay to ensure component is fully mounted
			const timeoutId = setTimeout(() => {
				console.log('Automation: Triggering upload via UploaderOrchestrator');
				uploaderOrchestratorRef?.startUpload();
			}, 200);
			return () => clearTimeout(timeoutId);
		}
	});

	const canStartUpload = $derived(
		processingStep === MangaProcessingStep.READY ||
			processingStep === MangaProcessingStep.READY_WARNING ||
			processingStep === MangaProcessingStep.SERIES_LOOKUP
	);
	const nonDeletedChapters = $derived(chapters.filter((ch) => !ch.isDeleted));

	// Watch for all chapters to be completed and mark zip as completed
	$effect(() => {
		if (processingStep === MangaProcessingStep.UPLOADING && chapters.length > 0) {
			const allCompleted = chapters.every(
				(chapter) => chapter.status === ChapterStatus.COMPLETED || chapter.isDeleted
			);
			const hasNonDeletedChapters = chapters.some((chapter) => !chapter.isDeleted);

			if (allCompleted && hasNonDeletedChapters) {
				// Check if any non-deleted chapters failed
				const hasFailedChapters = chapters.some(
					(chapter) => !chapter.isDeleted && chapter.status === ChapterStatus.FAILED
				);
				const success = !hasFailedChapters;
				// All chapters are completed, mark zip as completed or error
				guidedState.setZipStatus(
					zipFile,
					success ? MangaProcessingStatus.COMPLETED : MangaProcessingStatus.ERROR
				);
				handleUploadDone(success);
			}
		}
	});
</script>

<div class="flex flex-col gap-4 {className}">
	<h2 class="text-2xl font-bold text-app">Processing: {zipFile.name}</h2>

	{#if processingStep === MangaProcessingStep.LOADING || processingStep === MangaProcessingStep.EXTRACTING}
		<div class="flex flex-col gap-2 items-center">
			<div class="animate-spin rounded-full h-8 w-8 outline-dotted outline-5 border-surface"></div>
			<p class="text-sm text-muted">
				{processingStep === MangaProcessingStep.LOADING
					? 'Loading manga folder...'
					: 'Extracting zip files...'}
			</p>
			{#if currentlyProcessingZip}
				<p class="text-xs text-muted">Processing: {currentlyProcessingZip}</p>
			{/if}
		</div>
	{:else if processingStep === MangaProcessingStep.READY || processingStep === MangaProcessingStep.READY_WARNING || processingStep === MangaProcessingStep.SERIES_LOOKUP}
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

			{#if processingStep === MangaProcessingStep.SERIES_LOOKUP}
				<div class="flex flex-col gap-2">
					<p class="text-sm text-muted">Loading chapter dump and applying groups/titles...</p>
				</div>
			{/if}
			{#if processingStep === MangaProcessingStep.READY_WARNING}
				<div
					class="bg-yellow-500/20 dark:bg-yellow-500/10 border-1 border-yellow-500 rounded-md p-3"
				>
					<p class="text-sm text-yellow-600 dark:text-yellow-400 font-semibold mb-2">
						⚠️ Ready with warnings - Automation will skip this zip. You can still upload manually.
					</p>
					<div class="flex flex-col gap-1 text-xs text-yellow-700 dark:text-yellow-300">
						{#if duplicateChapters.length > 0}
							<p>
								• {duplicateChapters.length} duplicate chapter{duplicateChapters.length === 1
									? ''
									: 's'} detected
							</p>
						{/if}
						{#if dumpLookupFailed && dumpLookupFailedGroups.length === 0 && dumpLookupFailedTitles === 0}
							<p>• Chapter dump lookup failed</p>
						{/if}
						{#if dumpLookupFailedGroups.length > 0}
							<p>
								• {dumpLookupFailedGroups.length} group{dumpLookupFailedGroups.length === 1
									? ''
									: 's'} failed to lookup: {dumpLookupFailedGroups.join(', ')}
							</p>
						{/if}
						{#if dumpLookupFailedTitles > 0}
							<p>
								• {dumpLookupFailedTitles} chapter title{dumpLookupFailedTitles === 1 ? '' : 's'} failed
								to resolve
							</p>
						{/if}
					</div>
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
						<GuidedChapterEditor {index} {chapter} />
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
	{:else if processingStep === MangaProcessingStep.UPLOADING}
		<UploaderOrchestrator
			onDone={handleUploadDone}
			bind:busy={uploadWorking}
			bind:this={uploaderOrchestratorRef}
		/>
	{:else if processingStep === MangaProcessingStep.COMPLETED}
		<div class="bg-green-500/20 dark:bg-green-500/10 border-1 border-green-500 rounded-md p-4">
			<p class="text-sm font-semibold text-green-600 dark:text-green-400">
				✓ Upload completed successfully!
			</p>
		</div>
	{/if}
</div>
