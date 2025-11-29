<script lang="ts">
	import type { ChapterState } from '$lib/core/UploadingState.svelte';

	interface Props {
		chapters: ChapterState[];
	}

	let { chapters: chapterStates = $bindable<ChapterState[]>([]) }: Props = $props();

	let titleRegex = $state('');
	let volumeRegex = $state('');
	let chapterRegex = $state('');
</script>

<div class="flex flex-col gap-2">
	<p>
		Here you have the ability to batch apply changes to all chapters at once.
		<br />
		For title / volume / chapter number extraction, Regex is used, where the first capture group will
		be used to set the value.
		<br />
		Should batch editing not be enough, you can manually edit each chapter individually, including removing
		pages.
		<br />
		You are also able to assign groups to chapters, but for this you first need to register them with
		Group Preparation above.
	</p>

	<!-- Title Regex -->
	<form
		onsubmit={(e) => e.preventDefault()}
		class="flex flex-row gap-2 bg-gray-100 rounded-md p-2 items-center"
	>
		<p class="font-bold">Extract Title Regex:</p>
		<input
			type="text"
			bind:value={titleRegex}
			placeholder="^(.+?)\s+-\s+Vol"
			class="border grow-1 bg-white border-gray-300 rounded-md p-1"
		/>
		<button
			type="submit"
			class="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white rounded-md px-2 py-1"
		>
			Apply
		</button>
	</form>

	<!-- Volume Regex -->
	<form
		onsubmit={(e) => e.preventDefault()}
		class="flex flex-row gap-2 bg-gray-100 rounded-md p-2 items-center"
	>
		<p class="font-bold">Extract Volume Regex:</p>
		<input
			type="text"
			bind:value={volumeRegex}
			placeholder="Vol\.? ?(\d+)"
			class="border grow-1 bg-white border-gray-300 rounded-md p-1"
		/>
		<button
			type="submit"
			class="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white rounded-md px-2 py-1"
		>
			Apply
		</button>
	</form>

	<!-- Chapter Number Regex -->
	<form
		onsubmit={(e) => e.preventDefault()}
		class="flex flex-row gap-2 bg-gray-100 rounded-md p-2 items-center"
	>
		<p class="font-bold">Extract Chapter Number Regex:</p>
		<input
			type="text"
			bind:value={chapterRegex}
			placeholder="Ch\.? ?(\d+)"
			class="border grow-1 bg-white border-gray-300 rounded-md p-1"
		/>
		<button
			type="submit"
			class="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white rounded-md px-2 py-1"
		>
			Apply
		</button>
	</form>
</div>
