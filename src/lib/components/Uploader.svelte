<script lang="ts">
	import type { SelectedFolder } from '$lib/core/GroupedFolders';
	import ApiAuthSetup from './ApiAuthSetup.svelte';
	import FolderList from './FolderList.svelte';

	interface GroupedData {
		name: string;
		nameFolder: SelectedFolder;
		files: Array<{ file: SelectedFolder['files'][0]; folder: SelectedFolder }>;
	}

	interface Props {
		groups: GroupedData[];
	}

	let { groups: initialGroups }: Props = $props();

	// API validation state
	let validated = $state(false);

	// Create a mutable copy of groups
	let groups = $state<GroupedData[]>([...initialGroups]);

	// Sync groups when initialGroups changes
	$effect(() => {
		groups = [...initialGroups];
	});

	function removeFolder(groupName: string, event: Event) {
		event.stopPropagation();
		groups = groups.filter(g => g.name !== groupName);
	}

	function removeFile(groupName: string, fileIndex: number, event: Event) {
		event.stopPropagation();
		const groupIndex = groups.findIndex(g => g.name === groupName);
		if (groupIndex !== -1) {
			const newGroups = [...groups];
			newGroups[groupIndex] = {
				...newGroups[groupIndex],
				files: newGroups[groupIndex].files.filter((_, i) => i !== fileIndex)
			};
			// Remove folder if no files remain
			if (newGroups[groupIndex].files.length === 0) {
				groups = newGroups.filter((_, i) => i !== groupIndex);
			} else {
				groups = newGroups;
			}
		}
	}
</script>

<div class="space-y-6">
	<ApiAuthSetup bind:validated />

	<FolderList 
		groups={groups} 
		onRemoveFolder={removeFolder}
		onRemoveFile={removeFile}
	/>
</div>

