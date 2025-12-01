<script lang="ts">
	import type { ChapterUploadingGroup, ScanGroup } from '$lib/core/UploadingState.svelte';
	import { getContext } from 'svelte';
	import DropdownMultiSelector from '../Common/DropdownMultiSelector.svelte';
	import { TargetingState, targetingStateContext } from './TargetingState.svelte';

	const targetingState = getContext<TargetingState>(targetingStateContext);
	if (!targetingState) {
		throw new Error(
			'TargetingEditableGroup must be used within a component that provides TargetingState context'
		);
	}

	const availableGroups = $derived(targetingState.availableScanGroups);

	interface Props {
		groups: ChapterUploadingGroup;
	}

	let {
		groups: boundGroups = $bindable<ChapterUploadingGroup>(null as unknown as ChapterUploadingGroup)
	}: Props = $props();

	let isEditing = $state(false);
	let selectedGroups = $state<ScanGroup[] | null>(null);
	let dropdownOpen = $state(false);
	let dropdownTriggerRef: HTMLDivElement | null = $state(null);
	let buttonRef: HTMLButtonElement | null = $state(null);
	let savedButtonRect: DOMRect | null = $state(null);

	function startEditing() {
		// Capture button position before it's removed from DOM
		if (buttonRef) {
			savedButtonRect = buttonRef.getBoundingClientRect();
		}

		// Reset selectedGroups to match current boundGroups.groupIds to avoid stale selections
		// This ensures each edit session starts fresh with the current state
		// Use empty array instead of null to avoid DropdownMultiSelector's effect that converts null to []
		if (boundGroups.groupIds) {
			selectedGroups = boundGroups.groupIds
				.map((groupId) => availableGroups.find((group) => group.groupId === groupId))
				.filter((group): group is ScanGroup => group !== undefined);
		} else {
			selectedGroups = [];
		}

		isEditing = true;
		dropdownOpen = true;

		window.addEventListener('keydown', handleKeyDown);
	}

	function stopEditing() {
		isEditing = false;
		dropdownOpen = false;
		savedButtonRect = null;
		window.removeEventListener('keydown', handleKeyDown);

		boundGroups.groupIds = selectedGroups?.map((group) => group.groupId) ?? [];
	}

	function handleDropdownClose() {
		stopEditing();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			stopEditing();
		}
	}
</script>

<div>
	{#if isEditing}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div bind:this={dropdownTriggerRef} onclick={(e) => e.stopPropagation()}>
			<DropdownMultiSelector
				items={availableGroups}
				bind:selectedItems={selectedGroups}
				bind:isOpen={dropdownOpen}
				onClose={handleDropdownClose}
				buttonRect={savedButtonRect}
			/>
		</div>
	{/if}
	<button
		bind:this={buttonRef}
		type="button"
		class="flex flex-row gap-2 bg-gray-100 hover:bg-gray-200 cursor-pointer rounded-md px-1 border border-gray-300"
		onclick={(e) => {
			e.stopPropagation();
			startEditing();
		}}
		aria-label="Edit groups"
	>
		{#if boundGroups.groupIds && boundGroups.groupIds.length > 0}
			<p>
				{boundGroups.groupIds
					.map((groupId) => {
						const group = availableGroups.find((group) => group.groupId === groupId);
						return group?.groupName ?? groupId;
					})
					.join(', ')}
			</p>
		{:else}
			<p>No group</p>
		{/if}
	</button>
</div>
