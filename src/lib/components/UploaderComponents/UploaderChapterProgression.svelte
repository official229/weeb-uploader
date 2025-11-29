<script lang="ts">
	import type { ChapterState } from '$lib/core/UploadingState.svelte';

	interface Props {
		chapter: ChapterState;
	}

	let { chapter }: Props = $props();
</script>

<div class="flex flex-col gap-2">
	<p>{chapter.chapterTitle}</p>
	<p>{chapter.chapterNumber}</p>
	<p>{chapter.chapterVolume}</p>
	<p>{chapter.originalFolderPath}</p>
	<p>{chapter.status}</p>
	<p>{chapter.progress}</p>
	<p>{chapter.error}</p>
	<p>{chapter.associatedGroup.groupIds}</p>
	<p>{chapter.associatedGroup.groupName}</p>
	<p>{chapter.associatedGroup.groupDescription}</p>
</div>
