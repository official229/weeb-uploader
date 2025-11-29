<script lang="ts">
	import type { SelectedFolder } from '$lib/core/GroupedFolders';

	interface Props {
		selectedFolders: SelectedFolder[];
	}

	const { selectedFolders }: Props = $props();
</script>

<div>
	<h2 class="text-xl font-semibold">Targeting Preparation</h2>
	{#each selectedFolders as folder}
		<div>
			<h3 class="text-lg font-semibold">{folder.name}</h3>
			<p class="text-sm text-gray-500">{folder.path}</p>
		</div>
	{/each}
</div>
