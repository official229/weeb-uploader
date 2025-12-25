<script lang="ts">
	import { getContext } from 'svelte';
	import { TargetingState, targetingStateContext, searchGroups } from './TargetingState.svelte';
	import { ScanGroup } from '$lib/core/UploadingState.svelte';
	import { CHAPTER_TITLE_EXPORT_RESOLVER } from '$lib/core/ChapterTitleExportResolver.svelte';

	const targetingState = getContext<TargetingState>(targetingStateContext);
	if (!targetingState) {
		throw new Error(
			'SeriesChapterDumpLookup must be used within a component that provides TargetingState context'
		);
	}

	let isLoading = $state<boolean>(false);
	let hasData = $state<boolean>(false);
	let groupCount = $state<number>(0);
	let error = $state<string | null>(null);
	let addedGroupsCount = $state<number>(0);
	let failedGroups = $state<string[]>([]);
	let lastProcessedSeriesId = $state<string | null>(null);
	let loadPromise: Promise<void> | null = null;

	$effect(() => {
		if (targetingState.seriesId) {
			// Only load if this is a different series or we haven't processed this one yet
			if (targetingState.seriesId !== lastProcessedSeriesId && !isLoading) {
				loadChapterData(targetingState.seriesId);
			}
		} else {
			// Reset state when series is cleared
			hasData = false;
			groupCount = 0;
			error = null;
			addedGroupsCount = 0;
			failedGroups = [];
			lastProcessedSeriesId = null;
			loadPromise = null;
		}
	});

	async function loadChapterData(seriesId: string) {
		// Prevent concurrent executions for the same series
		if (isLoading && lastProcessedSeriesId === seriesId) {
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

		isLoading = true;
		error = null;
		hasData = false;
		groupCount = 0;
		addedGroupsCount = 0;
		failedGroups = [];

		loadPromise = (async () => {
			try {
				// Explicitly load the CSV data
				await CHAPTER_TITLE_EXPORT_RESOLVER.load();

				// Get all unique group names for this series
				const groupNames = await CHAPTER_TITLE_EXPORT_RESOLVER.getAllGroupNames(seriesId);

				if (groupNames.length === 0) {
					hasData = false;
					lastProcessedSeriesId = seriesId;
					return;
				}

				hasData = true;
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
				error = err instanceof Error ? err.message : 'Failed to load chapter data';
				console.error('Error loading chapter data:', err);
			} finally {
				isLoading = false;
				loadPromise = null;
			}
		})();

		await loadPromise;
	}
</script>

<div class="flex flex-col gap-2 bg-surface rounded-md p-4">
	<div class="flex flex-row gap-2 items-center">
		<h3 class="text-sm font-medium text-app">Chapter Dump Lookup</h3>
	</div>

	{#if isLoading}
		<p class="text-app">Loading chapter data...</p>
	{:else if error}
		<p class="text-red-500 dark:text-red-400">{error}</p>
	{:else if !hasData}
		<p class="text-muted">No dumped chapter lookups available.</p>
	{:else if hasData}
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
		</div>
	{/if}
</div>
