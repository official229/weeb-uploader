<script lang="ts">
	import { onMount } from 'svelte';

	const COMPLETED_IDS_KEY = 'completedWeebdexIds';

	type ViewMode = 'per-session' | 'all-combined';

	let viewMode = $state<ViewMode>('per-session');
	let selectedTimestamp = $state<string | null>(null);
	let isExpanded = $state(false);

	interface SessionData {
		timestamp: string;
		ids: string[];
	}

	let sessions = $state<SessionData[]>([]);
	let allCombinedIds = $state<string[]>([]);

	function loadData() {
		if (typeof window === 'undefined') return;

		try {
			const allSessions = JSON.parse(localStorage.getItem(COMPLETED_IDS_KEY) || '{}') as Record<
				string,
				string[]
			>;

			// Convert to array and sort by timestamp (newest first)
			sessions = Object.entries(allSessions)
				.map(([timestamp, ids]) => ({
					timestamp,
					ids: [...ids] // Create a copy
				}))
				.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

			// Get all unique IDs across all sessions
			const allIdsSet = new Set<string>();
			for (const session of sessions) {
				for (const id of session.ids) {
					allIdsSet.add(id);
				}
			}
			allCombinedIds = Array.from(allIdsSet).sort();
		} catch (error) {
			console.error('Failed to load completed IDs from localStorage:', error);
			sessions = [];
			allCombinedIds = [];
		}
	}

	function formatTimestamp(isoString: string): string {
		try {
			const date = new Date(isoString);
			return date.toLocaleString();
		} catch {
			return isoString;
		}
	}

	function copyToClipboard(text: string) {
		if (typeof navigator === 'undefined' || !navigator.clipboard) return;
		navigator.clipboard.writeText(text).catch((err) => {
			console.error('Failed to copy to clipboard:', err);
		});
	}

	function getIdsToDisplay(): string[] {
		if (viewMode === 'all-combined') {
			return allCombinedIds;
		} else if (selectedTimestamp) {
			const session = sessions.find((s) => s.timestamp === selectedTimestamp);
			return session?.ids || [];
		}
		return [];
	}

	function getDisplayTitle(): string {
		if (viewMode === 'all-combined') {
			return `All Combined IDs (${allCombinedIds.length} unique)`;
		} else if (selectedTimestamp) {
			const session = sessions.find((s) => s.timestamp === selectedTimestamp);
			return session
				? `${formatTimestamp(selectedTimestamp)} (${session.ids.length} IDs)`
				: 'No session selected';
		}
		return 'Select a session';
	}

	// Load data on mount only
	onMount(() => {
		loadData();
	});
</script>

<div class="flex flex-col gap-4 bg-surface rounded-md p-4">
	<button
		type="button"
		class="flex flex-row items-center gap-2 w-full text-left cursor-pointer hover:bg-surface-hover rounded-md p-2 -m-2 transition-colors"
		onclick={() => {
			isExpanded = !isExpanded;
		}}
	>
		<span class="w-4 h-4 flex items-center justify-center">
			{#if isExpanded}
				<span class="i-mdi-chevron-down text-muted"></span>
			{:else}
				<span class="i-mdi-chevron-right text-muted"></span>
			{/if}
		</span>
		<h3 class="text-lg font-semibold text-app">Completed WeebDex IDs</h3>
	</button>

	{#if isExpanded}
		<div class="flex flex-row gap-2 items-center">
			<label for="view-mode" class="text-sm text-muted">View Mode:</label>
			<button
				type="button"
				class="btn-base px-3 py-1 text-sm {viewMode === 'per-session'
					? 'btn-primary'
					: 'btn-neutral'}"
				onclick={() => {
					viewMode = 'per-session';
					selectedTimestamp = null;
				}}
			>
				Per Session
			</button>
			<button
				type="button"
				class="btn-base px-3 py-1 text-sm {viewMode === 'all-combined'
					? 'btn-primary'
					: 'btn-neutral'}"
				onclick={() => {
					viewMode = 'all-combined';
					selectedTimestamp = null;
				}}
			>
				All Combined
			</button>
		</div>

		{#if viewMode === 'per-session'}
			<div class="flex flex-col gap-2">
				<label for="session-selector" class="text-sm font-medium text-app">Select Session:</label>
				<select
					class="bg-surface border border-surface rounded-md px-3 py-2 text-app"
					onchange={(e) => {
						selectedTimestamp = (e.target as HTMLSelectElement).value || null;
					}}
				>
					<option value="">-- Select a session --</option>
					{#each sessions as session}
						<option value={session.timestamp}>
							{formatTimestamp(session.timestamp)} ({session.ids.length} IDs)
						</option>
					{/each}
				</select>
			</div>
		{/if}

		{#if (viewMode === 'all-combined' || selectedTimestamp) && getIdsToDisplay().length > 0}
			<div class="flex flex-col gap-2">
				<div class="flex flex-row justify-between items-center">
					<p class="text-sm font-medium text-app">{getDisplayTitle()}</p>
					<button
						type="button"
						class="btn-base btn-neutral px-3 py-1 text-sm"
						onclick={() => copyToClipboard(getIdsToDisplay().join('\n'))}
						title="Copy all IDs to clipboard"
					>
						Copy IDs
					</button>
				</div>
				<div class="bg-surface border border-surface rounded-md p-3 max-h-96 overflow-y-auto">
					<div class="flex flex-col gap-1">
						{#each getIdsToDisplay() as id}
							<div class="text-sm text-app font-mono">{id}</div>
						{/each}
					</div>
				</div>
			</div>
		{:else if viewMode === 'per-session' && !selectedTimestamp}
			<p class="text-sm text-muted">Please select a session to view IDs</p>
		{:else}
			<p class="text-sm text-muted">No completed IDs found</p>
		{/if}

		<div class="flex flex-row gap-2">
			<button type="button" class="btn-base btn-neutral px-3 py-1 text-sm" onclick={loadData}>
				Refresh
			</button>
			<button
				type="button"
				class="btn-base btn-danger px-3 py-1 text-sm"
				onclick={() => {
					if (
						confirm(
							'Are you sure you want to clear all completed IDs from localStorage? This cannot be undone.'
						)
					) {
						localStorage.removeItem(COMPLETED_IDS_KEY);
						loadData();
					}
				}}
			>
				Clear All
			</button>
		</div>
	{/if}
</div>
