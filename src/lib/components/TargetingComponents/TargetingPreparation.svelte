<script lang="ts">
	import type { SelectedFolder } from '$lib/core/GroupedFolders';
	import TargetingGroupValidator from '$lib/components/TargetingComponents/TargetingGroupValidator.svelte';
	import TargetingSeriesValidator from '$lib/components/TargetingComponents/TargetingSeriesValidator.svelte';

	interface Props {
		selectedFolders: SelectedFolder[];
	}

	const { selectedFolders }: Props = $props();
</script>

<div>
	<div class="flex flex-col gap-2">
		<h2 class="text-xl font-semibold">Targeting Preparation</h2>
		<TargetingSeriesValidator />
	</div>

	<div class="flex flex-col gap-2">
		<h2 class="text-xl font-semibold">Group Preparation</h2>
		<TargetingGroupValidator />
	</div>
</div>
