<script lang="ts">
	import { ScanGroup } from '$lib/core/UploadingState.svelte';
	import { getContext } from 'svelte';
	import {
		searchGroups,
		TargetingState,
		targetingStateContext,
		type GroupData
	} from './TargetingState.svelte';

	const targetingState = getContext<TargetingState>(targetingStateContext);
	if (!targetingState) {
		throw new Error(
			'TargetingGroupSearch must be used within a component that provides TargetingState context'
		);
	}

	let searchQuery = $state('');
	let searchResults = $state<GroupData[]>([]);
	let isSearching = $state(false);

	async function searchGroupsClick() {
		if (!searchQuery.trim() || searchQuery.trim().length <= 2 || isSearching) {
			return;
		}

		isSearching = true;
		try {
			const response = await searchGroups(searchQuery.trim());
			searchResults = response.data;
		} catch (error) {
			console.error(error);
		} finally {
			isSearching = false;
		}
	}

	function addGroup(id: string, name: string) {
		const newGroup = new ScanGroup();
		newGroup.groupId = id;
		newGroup.groupName = name;
		targetingState.availableScanGroups = [...targetingState.availableScanGroups, newGroup];
	}
</script>

<div class="flex flex-col gap-2 bg-gray-100 rounded-md p-4">
	<form
		class="flex flex-col gap-2"
		onsubmit={(e) => {
			e.preventDefault();
			searchGroupsClick();
		}}
	>
		<div class="flex flex-row gap-2 items-center grow-1">
			<label for="search-query-input" class="text-sm font-medium">Search for a group:</label>
			<input
				class="border border-gray-300 rounded-md p-2 grow-1 bg-white"
				id="search-query-input"
				type="text"
				bind:value={searchQuery}
				placeholder="Search for a group"
			/>
		</div>
		<button class="clickable-hint p-2 rounded-md" type="submit"> Search </button>
	</form>

	<div class="grid grid-cols-2 gap-2">
		{#if isSearching}
			<p>Searching...</p>
		{:else}
			{#each searchResults as result}
				<button
					class="flex flex-row gap-2 clickable-hint rounded-md p-4 border border-gray-300"
					onclick={() => addGroup(result.id, result.name)}
				>
					<div class="flex flex-row gap-2 items-center">
						<p class="text-sm text-gray-500">{result.id}</p>
						<p class="text-sm font-bold">{result.name}</p>
					</div>
					<div
						class="i-mdi-plus h-5 w-5 bg-green-500"
						aria-label="Add group"
						title="Add group"
					></div>
				</button>
			{/each}
		{/if}
	</div>
</div>
