<script lang="ts">
	import type { ScanGroup } from '$lib/core/UploadingState.svelte';

	interface Props {
		availableGroups: ScanGroup[];
		selectedGroupIds: string[];
		onToggle: (groupId: string) => void;
		onClear: () => void;
		buttonRef?: HTMLButtonElement | null;
		isOpen: boolean;
		onOpenChange: (open: boolean) => void;
	}

	let {
		availableGroups,
		selectedGroupIds,
		onToggle,
		onClear,
		buttonRef,
		isOpen,
		onOpenChange
	}: Props = $props();

	let dropdownPosition = $state<{ top: number; left: number } | null>(null);

	function updatePosition() {
		if (buttonRef) {
			const rect = buttonRef.getBoundingClientRect();
			// For position: fixed, use viewport coordinates directly (no scroll offset needed)
			dropdownPosition = {
				top: rect.bottom + 4, // 4px gap below button
				left: rect.left
			};
		}
	}

	$effect(() => {
		if (isOpen && buttonRef) {
			updatePosition();

			const handleScroll = () => updatePosition();
			const handleResize = () => updatePosition();

			const handleClickOutside = (event: MouseEvent) => {
				const target = event.target as HTMLElement;
				const dropdownMenu = document.querySelector('.group-dropdown-menu');

				if (
					buttonRef &&
					!buttonRef.contains(target) &&
					dropdownMenu &&
					!dropdownMenu.contains(target)
				) {
					onOpenChange(false);
				}
			};

			// Use setTimeout to avoid immediate closure when opening
			const timeoutId = setTimeout(() => {
				window.addEventListener('scroll', handleScroll, true);
				window.addEventListener('resize', handleResize);
				document.addEventListener('click', handleClickOutside, true);
			}, 10);

			return () => {
				clearTimeout(timeoutId);
				window.removeEventListener('scroll', handleScroll, true);
				window.removeEventListener('resize', handleResize);
				document.removeEventListener('click', handleClickOutside, true);
			};
		}
	});

	function getGroupName(groupId: string): string {
		const group = availableGroups.find((g) => g.groupId === groupId);
		return group?.groupName ?? groupId;
	}
</script>

{#if isOpen && dropdownPosition}
	<div
		class="fixed z-[9999] group-dropdown-menu"
		style="top: {dropdownPosition.top}px; left: {dropdownPosition.left}px;"
		onclick={(e) => e.stopPropagation()}
		role="presentation"
	>
		<div
			class="w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto"
		>
			<div class="p-2 space-y-1">
				<!-- No Group Option -->
				<button
					type="button"
					onclick={() => {
						onClear();
						onOpenChange(false);
					}}
					class="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex items-center gap-2 {selectedGroupIds.length ===
					0
						? 'bg-red-50 dark:bg-red-900/20 font-medium'
						: ''}"
				>
					<span class="i-mdi-close-circle text-base"></span>
					<span>No Group</span>
				</button>

				{#if availableGroups.length > 0}
					<div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
				{/if}

				<!-- Group Options -->
				{#each availableGroups as group}
					<label
						class="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors {selectedGroupIds.includes(
							group.groupId
						)
							? 'bg-blue-50 dark:bg-blue-900/20'
							: ''}"
					>
						<input
							type="checkbox"
							checked={selectedGroupIds.includes(group.groupId)}
							onchange={() => onToggle(group.groupId)}
							class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
						/>
						<span class="flex-1">{group.groupName}</span>
					</label>
				{/each}

				{#if availableGroups.length === 0}
					<div class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 italic">
						No groups available. Add groups in the Group Management section above.
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
