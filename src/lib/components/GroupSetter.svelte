<script lang="ts">
	import { getContext } from 'svelte';
	import { GlobalState, globalStateContext } from '$lib/core/GlobalState.svelte';
	import { ScanGroup } from '$lib/core/UploadingState.svelte';

	interface GroupData {
		id: string;
		name: string;
		description?: string;
		contact_email?: string;
		discord?: string;
		twitter?: string;
		website?: string;
		mangadex?: string;
		mangaupdates?: string;
		inactive?: boolean;
		locked?: boolean;
		created_at?: string;
		updated_at?: string;
		version?: number;
		relationships?: {
			members?: Array<{
				id: string;
				name: string;
				avatar_url?: string;
				description?: string;
				discord?: string;
				twitter?: string;
				website?: string;
				is_leader?: boolean;
				is_officer?: boolean;
				roles?: string[];
				version?: number;
			}>;
		};
	}

	const globalState = getContext(globalStateContext) as GlobalState;
	if (!globalState) {
		throw new Error(
			'GroupSetter must be used within a component that provides GlobalState context'
		);
	}

	let inputValue = $state('');
	let isValidating = $state(false);
	let validationError = $state<string | null>(null);
	let groupData = $state<GroupData | null>(null);

	// Computed derived state for available groups
	const availableGroups = $derived(globalState.availableScanGroups);

	async function loadGroupData(id: string) {
		isValidating = true;
		validationError = null;

		try {
			const response = await fetch(`https://api.weebdex.org/group/${id}`);

			if (response.ok) {
				const data = await response.json();
				groupData = data;
				validationError = null;
			} else {
				validationError = `Group not found: ${response.status} ${response.statusText}`;
				groupData = null;
			}
		} catch (error) {
			validationError = error instanceof Error ? error.message : 'Failed to load group';
			groupData = null;
		} finally {
			isValidating = false;
		}
	}

	async function validateAndAddGroup() {
		if (!inputValue.trim()) {
			validationError = 'Please enter a group ID';
			return;
		}

		await loadGroupData(inputValue.trim());
		if (groupData && groupData.id && groupData.name) {
			// Store values to avoid null check issues
			const groupId = groupData.id;
			const groupName = groupData.name;

			// Check if group already exists
			const existingGroup = globalState.availableScanGroups.find((g) => g.groupId === groupId);

			if (existingGroup) {
				validationError = 'This group is already registered';
				return;
			}

			// Add new group to global state
			const newGroup = new ScanGroup();
			newGroup.groupId = groupId;
			newGroup.groupName = groupName;

			globalState.availableScanGroups = [...globalState.availableScanGroups, newGroup];
			inputValue = '';
			groupData = null;
			validationError = null;
		}
	}

	function removeGroup(groupId: string) {
		globalState.availableScanGroups = globalState.availableScanGroups.filter(
			(g) => g.groupId !== groupId
		);
	}
</script>

<div class="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
	<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Scan Group Management</h2>

	<!-- Add New Group -->
	<div class="space-y-3">
		<div>
			<label
				for="group-id-input"
				class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
			>
				Group ID
			</label>
			<input
				id="group-id-input"
				type="text"
				bind:value={inputValue}
				placeholder="Enter group ID"
				disabled={isValidating}
				class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
				onkeydown={(e) => {
					if (e.key === 'Enter' && !isValidating && inputValue.trim()) {
						validateAndAddGroup();
					}
				}}
			/>
		</div>

		{#if validationError}
			<div
				class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
			>
				<p class="text-sm text-red-800 dark:text-red-200">{validationError}</p>
			</div>
		{/if}

		<button
			type="button"
			onclick={validateAndAddGroup}
			disabled={isValidating || !inputValue.trim()}
			class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
		>
			{#if isValidating}
				<svg
					class="animate-spin h-5 w-5"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				<span>Validating...</span>
			{:else}
				<span>Add Group</span>
			{/if}
		</button>
	</div>

	<!-- Registered Groups List -->
	{#if availableGroups.length > 0}
		<div class="space-y-2 pt-4 border-t border-gray-300 dark:border-gray-600">
			<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
				Registered Groups ({availableGroups.length})
			</h3>
			<div class="space-y-2">
				{#each availableGroups as group}
					<div
						class="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
					>
						<div class="flex-1 min-w-0">
							<div class="font-medium text-gray-900 dark:text-gray-100 truncate">
								{group.groupName}
							</div>
							<div class="text-xs text-gray-500 dark:text-gray-400 truncate">
								ID: {group.groupId}
							</div>
						</div>
						<button
							type="button"
							onclick={() => removeGroup(group.groupId)}
							class="flex-shrink-0 px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors flex items-center gap-1.5"
							title="Remove group"
						>
							<span class="i-mdi-delete text-base"></span>
							<span>Remove</span>
						</button>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="pt-4 border-t border-gray-300 dark:border-gray-600">
			<p class="text-sm text-gray-500 dark:text-gray-400 italic">
				No groups registered yet. Add a group ID above to get started.
			</p>
		</div>
	{/if}
</div>
