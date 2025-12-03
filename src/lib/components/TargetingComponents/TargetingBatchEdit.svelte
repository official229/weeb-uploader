<script lang="ts">
	import { ChapterUploadingGroup, type ChapterState } from '$lib/core/UploadingState.svelte';
	import TargetingEditableGroup from './TargetingEditableGroup.svelte';

	interface Props {
		chapters: ChapterState[];
	}

	let { chapters: chapterStates = $bindable<ChapterState[]>([]) }: Props = $props();

	let titleRegex = $state('');
	let volumeRegex = $state('');
	let chapterRegex = $state('');
	let groups = $state<ChapterUploadingGroup>(new ChapterUploadingGroup());

	// starting index: 1
	let rangeStart = $state<number | null>(null);
	let rangeEnd = $state<number | null>(null);

	function applyTitleRegex() {
		if (!titleRegex.trim()) return;

		const regex = new RegExp(titleRegex);
		chapterStates.forEach((chapter) => {
			if (!chapter.originalFolderPath) return;

			const match = chapter.originalFolderPath.match(regex);
			if (match && match[1]) {
				chapter.chapterTitle = match[1];
			}
		});
	}

	function applyVolumeRegex() {
		if (!volumeRegex.trim()) return;

		const regex = new RegExp(volumeRegex);
		chapterStates.forEach((chapter) => {
			if (!chapter.originalFolderPath) return;

			const match = chapter.originalFolderPath.match(regex);
			if (match && match[1]) {
				chapter.chapterVolume = match[1];
			}
		});
	}

	function applyChapterNumberRegex() {
		if (!chapterRegex.trim()) return;

		const regex = new RegExp(chapterRegex);
		chapterStates.forEach((chapter) => {
			if (!chapter.originalFolderPath) return;

			const match = chapter.originalFolderPath.match(regex);
			if (match && match[1]) {
				chapter.chapterNumber = match[1];
			}
		});
	}

	function resetTitles() {
		chapterStates.forEach((chapter) => {
			chapter.chapterTitle = chapter.originalFolderPath?.split('/').pop() ?? '';
		});
	}

	function clearTitles() {
		chapterStates.forEach((chapter) => {
			chapter.chapterTitle = '';
		});
	}

	function applyGroupsToRange() {
		const start = (rangeStart ?? 1) - 1;
		const end = (rangeEnd ?? chapterStates.length) - 1;
		const groupIds = groups.groupIds ?? [];

		for (let i = start; i <= end; i++) {
			chapterStates[i].associatedGroup.groupIds = [...groupIds];
		}
	}
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
		Group Preparation above. Groups will be applied to all chapters by default, or to the range if specified
		(values are inclusive)
	</p>

	<!-- Title Regex -->
	<form
		onsubmit={(e) => {
			applyTitleRegex();
			e.preventDefault();
		}}
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
			type="button"
			class="cursor-pointer bg-red-500 hover:bg-red-600 text-white rounded-md px-2 py-1"
			onclick={clearTitles}
		>
			Clear Titles
		</button>
		<button
			type="button"
			class="cursor-pointer bg-gray-500 hover:bg-gray-600 text-white rounded-md px-2 py-1 mr-10"
			onclick={resetTitles}
		>
			Reset Titles
		</button>
		<button
			type="submit"
			class="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white rounded-md px-2 py-1"
		>
			Apply
		</button>
	</form>

	<!-- Volume Regex -->
	<form
		onsubmit={(e) => {
			applyVolumeRegex();
			e.preventDefault();
		}}
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
		onsubmit={(e) => {
			applyChapterNumberRegex();
			e.preventDefault();
		}}
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

	<!-- Groups -->
	<form
		onsubmit={(e) => {
			applyGroupsToRange();
			e.preventDefault();
		}}
		class="flex flex-row gap-2 bg-gray-100 rounded-md p-2 items-center justify-between"
	>
		<div class="flex flex-row gap-2">
			<p class="font-bold">Assign Groups to All Chapters:</p>
			<TargetingEditableGroup bind:groups />
		</div>

		<div class="flex flex-row gap-2 items-center">
			<p>Range:</p>
			<input
				type="number"
				bind:value={rangeStart}
				placeholder="Start"
				min="1"
				max={chapterStates.length}
				class="border grow-1 bg-white border-gray-300 rounded-md p-1"
			/>
			<p>to</p>
			<input
				type="number"
				bind:value={rangeEnd}
				placeholder="End"
				min="1"
				max={chapterStates.length}
				class="border grow-1 bg-white border-gray-300 rounded-md p-1"
			/>

			<button
				type="submit"
				class="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white rounded-md px-2 py-1"
			>
				Apply
			</button>
		</div>
	</form>
</div>
