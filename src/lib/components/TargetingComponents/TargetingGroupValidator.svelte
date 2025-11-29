<script lang="ts">
	import { ApiAuthContext, apiAuthContext } from '$lib/core/GlobalState.svelte';
	import { getContext } from 'svelte';
	import {
		TargetingState,
		targetingStateContext,
		type GroupData,
		type MangaData
	} from '$lib/components/TargetingComponents/TargetingState.svelte';
	import { ScanGroup } from '$lib/core/UploadingState.svelte';

	const API_ENDPOINT = 'https://api.weebdex.org/group';

	const authContext = getContext<ApiAuthContext>(apiAuthContext);
	if (!authContext) {
		throw new Error(
			'TargetingGroupValidator must be used within a component that provides ApiAuthContext context'
		);
	}

	const targetingState = getContext<TargetingState>(targetingStateContext);
	if (!targetingState) {
		throw new Error(
			'TargetingGroupValidator must be used within a component that provides TargetingState context'
		);
	}

	let inputValue = $state('');
	let isValidating = $state(false);
	let validationError = $state<string | null>(null);
	let groupData = $state<GroupData | null>(null);

	function addGroup(id: string, name: string) {
		if (targetingState.availableScanGroups.find((g) => g.groupId === id)) {
			return;
		}
		const newGroup = new ScanGroup();
		newGroup.groupId = id;
		newGroup.groupName = name;

		targetingState.availableScanGroups = [...targetingState.availableScanGroups, newGroup];
	}

	function removeGroup(id: string) {
		targetingState.availableScanGroups = targetingState.availableScanGroups.filter(
			(g) => g.groupId !== id
		);
	}

	function reset() {
		inputValue = '';
		targetingState.availableScanGroups = [];
		groupData = null;
		validationError = null;
	}

	async function validateGroup() {
		if (!inputValue.trim()) {
			validationError = 'Please enter a group ID';
			return;
		}

		const token = authContext.apiToken;
		if (!token) {
			validationError = 'No API token found';
			return;
		}

		isValidating = true;
		validationError = null;

		try {
			const url = `${API_ENDPOINT}/${inputValue.trim()}`;
			const response = await fetch(url, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (response.ok) {
				const data = await response.json();
				groupData = data;
				addGroup(inputValue.trim(), data.name);
				validationError = null;
			} else {
				validationError = `Failed to validate series: ${response.status} ${response.statusText}`;
			}
		} catch (error) {
			validationError = error instanceof Error ? error.message : 'Failed to validate series';
		} finally {
			isValidating = false;
		}
	}
</script>

<div class="flex flex-col gap-2">
	<div class="flex flex-col gap-2 bg-gray-100 rounded-md p-4">
		<div class="flex flex-row gap-2 items-center">
			<label for="group-id-input" class="text-sm font-medium">Group ID:</label>
			<input
				class="border border-gray-300 rounded-md p-2 grow-1 bg-white"
				id="group-id-input"
				type="text"
				bind:value={inputValue}
				disabled={isValidating}
				placeholder="Enter group ID"
			/>
		</div>
		<button
			class="clickable-hint p-2 rounded-md"
			type="button"
			disabled={isValidating}
			onclick={validateGroup}
		>
			Add Group
		</button>

		{#if validationError}
			<p class="text-red-500">{validationError}</p>
		{/if}
		{#if isValidating}
			<p>Validating...</p>
		{/if}

		{#if targetingState.availableScanGroups.length > 0}
			<div class="grid grid-cols-2 gap-2">
				{#each targetingState.availableScanGroups as group}
					<div
						class="flex flex-row justify-between gap-2 bg-gray-100 rounded-md p-4 border border-gray-300"
					>
						<div class="flex flex-row gap-2 items-center">
							<p class="text-sm text-gray-500">{group.groupId}</p>
							<p class="text-sm font-bold">{group.groupName}</p>
						</div>
						<button
							type="button"
							onclick={() => removeGroup(group.groupId)}
							class="clickable-hint rounded-md p-1"
							aria-label="Remove"
							title="Remove"
						>
							<div class="i-mdi-delete h-5 w-5"></div>
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
