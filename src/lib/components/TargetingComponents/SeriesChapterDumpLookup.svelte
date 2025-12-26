<script lang="ts">
	import { getContext } from 'svelte';
	import { TargetingState, targetingStateContext, searchGroups } from './TargetingState.svelte';
	import { ScanGroup } from '$lib/core/UploadingState.svelte';
	import { CHAPTER_TITLE_EXPORT_RESOLVER } from '$lib/core/ChapterTitleExportResolver.svelte';

	enum LookupState {
		IDLE = 'IDLE',
		LOADING = 'LOADING',
		LOADED = 'LOADED',
		ERROR = 'ERROR',
		APPLYING = 'APPLYING'
	}

	const targetingState = getContext<TargetingState>(targetingStateContext);
	if (!targetingState) {
		throw new Error(
			'SeriesChapterDumpLookup must be used within a component that provides TargetingState context'
		);
	}

	let lookupState = $state<LookupState>(LookupState.IDLE);
	let groupCount = $state<number>(0);
	let error = $state<string | null>(null);
	let addedGroupsCount = $state<number>(0);
	let failedGroups = $state<string[]>([]);
	let lastProcessedSeriesId = $state<string | null>(null);
	let loadPromise: Promise<void> | null = null;
	let appliedGroupsCount = $state<number>(0);

	$effect(() => {
		(async () => {
			if (targetingState.seriesId) {
				// Only load if this is a different series or we haven't processed this one yet
				if (
					targetingState.seriesId !== lastProcessedSeriesId &&
					lookupState !== LookupState.LOADING
				) {
					await loadChapterData(targetingState.seriesId);
				}
			} else {
				// Reset state when series is cleared
				lookupState = LookupState.IDLE;
				groupCount = 0;
				error = null;
				addedGroupsCount = 0;
				failedGroups = [];
				lastProcessedSeriesId = null;
				loadPromise = null;
				appliedGroupsCount = 0;
			}
		})();
	});

	async function loadChapterData(seriesId: string) {
		// Prevent concurrent executions for the same series
		if (lookupState === LookupState.LOADING && lastProcessedSeriesId === seriesId) {
			return;
		}

		// If there's already a load in progress, wait for it
		if (loadPromise) {
			await loadPromise;
			// After waiting, check if we still need to process this series
			if (lastProcessedSeriesId === seriesId) {
				return;
			}
		}

		lookupState = LookupState.LOADING;
		error = null;
		groupCount = 0;
		addedGroupsCount = 0;
		failedGroups = [];
		appliedGroupsCount = 0;

		loadPromise = (async () => {
			try {
				// Explicitly load the CSV data
				await CHAPTER_TITLE_EXPORT_RESOLVER.load();

				// Get all unique group names for this series
				const groupNames = await CHAPTER_TITLE_EXPORT_RESOLVER.getAllGroupNames(seriesId);

				if (groupNames.length === 0) {
					lookupState = LookupState.IDLE;
					lastProcessedSeriesId = seriesId;
					return;
				}

				lookupState = LookupState.LOADED;
				groupCount = groupNames.length;

				// Clear existing available groups since we have dump data
				targetingState.availableScanGroups = [];

				// Look up each group and add to availableScanGroups
				let addedCount = 0;
				const failed: string[] = [];
				for (const groupName of groupNames) {
					try {
						// Search for the group via API
						const response = await searchGroups(groupName);

						if (!response.data) {
							failed.push(groupName);
							console.warn(`No data found for group "${groupName}"`);
							continue;
						}

						// Find exact match
						const exactMatch = response.data.find((g) => g.name === groupName);

						if (exactMatch) {
							const newGroup = new ScanGroup();
							newGroup.groupId = exactMatch.id;
							newGroup.groupName = exactMatch.name;
							targetingState.availableScanGroups = [
								...targetingState.availableScanGroups,
								newGroup
							];
							addedCount++;
						} else {
							// No exact match found
							failed.push(groupName);
							console.warn(`No exact match found for group "${groupName}"`);
						}
					} catch (err) {
						// Log error but continue with other groups
						failed.push(groupName);
						console.warn(`Failed to lookup group "${groupName}":`, err);
					}
				}

				failedGroups = failed;

				addedGroupsCount = addedCount;
				lastProcessedSeriesId = seriesId;
			} catch (err) {
				lookupState = LookupState.ERROR;
				error = err instanceof Error ? err.message : 'Failed to load chapter data';
				console.error('Error loading chapter data:', err);
			} finally {
				loadPromise = null;
			}
		})();

		await loadPromise;
	}

	async function applyGroupsToChapters() {
		console.log('availableScanGroups:', targetingState.availableScanGroups);
		if (lookupState !== LookupState.LOADED) {
			return;
		}

		lookupState = LookupState.APPLYING;
		let appliedCount = 0;

		try {
			// Iterate through all chapters
			for (const chapter of targetingState.chapterStates) {
				if (!chapter.originalFolderPath) {
					continue;
				}

				// Find groups that match the chapter's originalFolderPath
				const matchingGroups = targetingState.availableScanGroups.filter((group) => {
					// Check if the group name appears as a substring in the originalFolderPath
					return chapter.originalFolderPath?.includes(group.groupName) ?? false;
				});

				if (matchingGroups.length > 0) {
					// Get existing group IDs or create empty array
					const existingGroupIds = chapter.associatedGroup.groupIds ?? [];
					const existingSet = new Set(existingGroupIds);

					// Add new group IDs that aren't already present
					for (const group of matchingGroups) {
						if (!existingSet.has(group.groupId)) {
							existingSet.add(group.groupId);
							appliedCount++;
						}
					}

					// Update the chapter's group IDs
					chapter.associatedGroup.groupIds = Array.from(existingSet);
				}
			}

			appliedGroupsCount = appliedCount;
			lookupState = LookupState.LOADED;
		} catch (err) {
			lookupState = LookupState.ERROR;
			error = err instanceof Error ? err.message : 'Failed to apply groups to chapters';
			console.error('Error applying groups to chapters:', err);
		}
	}
</script>

<div class="flex flex-col gap-2 bg-surface rounded-md p-4">
	<div class="flex flex-row gap-2 items-center">
		<h3 class="text-sm font-medium text-app">Chapter Dump Lookup</h3>
	</div>

	{#if lookupState === LookupState.LOADING}
		<p class="text-app">Loading chapter data...</p>
	{:else if lookupState === LookupState.ERROR}
		<p class="text-red-500 dark:text-red-400">{error}</p>
	{:else if lookupState === LookupState.IDLE}
		<p class="text-muted">No dumped chapter lookups available.</p>
	{:else if lookupState === LookupState.LOADED || lookupState === LookupState.APPLYING}
		<div class="flex flex-col gap-1">
			<p class="text-sm text-app">
				Found {groupCount}
				{groupCount === 1 ? 'group' : 'groups'} in chapter dump.
			</p>
			{#if addedGroupsCount > 0}
				<p class="text-sm text-green-500 dark:text-green-400">
					Added {addedGroupsCount}
					{addedGroupsCount === 1 ? 'group' : 'groups'} to available scan groups.
				</p>
			{/if}
			{#if failedGroups.length > 0}
				<div class="flex flex-col gap-1 mt-2">
					<p class="text-sm text-yellow-500 dark:text-yellow-400 font-semibold">
						Warning: Failed to lookup {failedGroups.length}{' '}
						{failedGroups.length === 1 ? 'group' : 'groups'}:
					</p>
					<ul class="text-sm text-yellow-500 dark:text-yellow-400 list-disc list-inside ml-2">
						{#each failedGroups as failedGroup}
							<li>{failedGroup}</li>
						{/each}
					</ul>
				</div>
			{/if}
			{#if lookupState === LookupState.LOADED}
				<button
					type="button"
					onclick={applyGroupsToChapters}
					class="clickable-hint mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-400 dark:hover:bg-blue-500 text-white rounded-md text-sm font-medium transition-colors"
				>
					Apply Groups to Chapters
				</button>
			{:else if lookupState === LookupState.APPLYING}
				<p class="text-app mt-2">Applying groups to chapters...</p>
			{/if}
			{#if appliedGroupsCount > 0}
				<p class="text-sm text-green-500 dark:text-green-400 mt-2">
					Applied {appliedGroupsCount}
					{appliedGroupsCount === 1 ? 'group' : 'groups'} to chapters.
				</p>
			{/if}
		</div>
	{/if}
</div>
