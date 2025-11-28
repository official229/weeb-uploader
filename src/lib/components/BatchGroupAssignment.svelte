<script lang="ts">
	import type { ScanGroup } from '$lib/core/UploadingState.svelte';

	interface Props {
		availableGroups: ScanGroup[];
		chaptersCount: number;
		onAssignToAll: (groupIds: string[]) => void;
		onAssignToRange: (groupIds: string[], start: number, end: number) => void;
		onRemoveAll: () => void;
	}

	let { availableGroups, chaptersCount, onAssignToAll, onAssignToRange, onRemoveAll }: Props =
		$props();

	let batchGroupSelection = $state<Set<string>>(new Set());
	let rangeStart = $state<number | null>(null);
	let rangeEnd = $state<number | null>(null);

	function toggleGroupSelection(groupId: string) {
		const newSet = new Set(batchGroupSelection);
		if (newSet.has(groupId)) {
			newSet.delete(groupId);
		} else {
			newSet.add(groupId);
		}
		batchGroupSelection = newSet;
	}

	function handleAssignToAll() {
		onAssignToAll(Array.from(batchGroupSelection));
	}

	function handleAssignToRange() {
		if (rangeStart !== null && rangeEnd !== null) {
			onAssignToRange(Array.from(batchGroupSelection), rangeStart, rangeEnd);
			rangeStart = null;
			rangeEnd = null;
		}
	}
</script>

{#if availableGroups.length > 0}
	<div
		class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600"
	>
		<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
			Batch Group Assignment
		</h3>
		<div class="space-y-4">
			<!-- Group Selection -->
			<div>
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Select Groups
				</label>
				<div class="flex flex-wrap gap-2">
					{#each availableGroups as group}
						<label
							class="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors {batchGroupSelection.has(
								group.groupId
							)
								? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
								: ''}"
						>
							<input
								type="checkbox"
								checked={batchGroupSelection.has(group.groupId)}
								onchange={() => toggleGroupSelection(group.groupId)}
								class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
							/>
							<span class="text-sm text-gray-900 dark:text-gray-100">{group.groupName}</span>
						</label>
					{/each}
				</div>
			</div>

			<!-- Assignment Actions -->
			<div class="flex flex-wrap gap-3">
				<button
					type="button"
					onclick={handleAssignToAll}
					disabled={batchGroupSelection.size === 0}
					class="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md transition-colors font-medium"
				>
					Assign to All Chapters
				</button>
				<button
					type="button"
					onclick={onRemoveAll}
					class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors font-medium"
				>
					Remove All Groups
				</button>

				<div class="flex items-center gap-2">
					<label class="text-sm text-gray-700 dark:text-gray-300">Range:</label>
					<input
						type="number"
						bind:value={rangeStart}
						placeholder="Start"
						min="1"
						max={chaptersCount}
						class="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
					/>
					<span class="text-gray-500">to</span>
					<input
						type="number"
						bind:value={rangeEnd}
						placeholder="End"
						min="1"
						max={chaptersCount}
						class="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
					/>
					<button
						type="button"
						onclick={handleAssignToRange}
						disabled={batchGroupSelection.size === 0 || rangeStart === null || rangeEnd === null}
						class="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md transition-colors font-medium"
					>
						Assign to Range
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

