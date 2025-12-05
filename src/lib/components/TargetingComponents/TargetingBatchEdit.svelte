<script lang="ts">
	import { ChapterUploadingGroup, type ChapterState } from '$lib/core/UploadingState.svelte';
	import RangeProvider from '../Common/RangeProvider.svelte';
	import TargetingEditableGroup from './TargetingEditableGroup.svelte';

	interface Props {
		chapters: ChapterState[];
	}

	let { chapters: chapterStates = $bindable<ChapterState[]>([]) }: Props = $props();

	let titleRegex = $state('- (.+)$');
	let titleCaseSensitive = $state(false);
	let volumeRegex = $state('Vol\\.? ?(\\d+)');
	let volumeCaseSensitive = $state(false);
	let chapterRegex = $state('(?:Ch\\.?|Chapter) ?(\\d+(?:\\.\\d+)?)');
	let chapterCaseSensitive = $state(false);

	let groups = $state<ChapterUploadingGroup>(new ChapterUploadingGroup());

	// starting index: 1
	const groupRange = $state({
		start: null,
		end: null
	});
	const titleRange = $state({
		start: null,
		end: null
	});
	const volumeRange = $state({
		start: null,
		end: null
	});
	const chapterNumberRange = $state({
		start: null,
		end: null
	});

	function applyTitleRegex() {
		if (!titleRegex.trim()) return;

		const flags = titleCaseSensitive ? '' : 'i';
		const regex = new RegExp(titleRegex, flags);
		const start = (titleRange.start ?? 1) - 1;
		const end = (titleRange.end ?? chapterStates.length) - 1;

		for (let i = start; i <= end; i++) {
			const chapter = chapterStates[i];
			if (!chapter.originalFolderPath) continue;
			// Skip if title was manually edited
			if (chapter.manuallyEditedFields.has('title')) continue;

			const match = chapter.originalFolderPath.match(regex);
			if (match && match[1]) {
				chapter.chapterTitle = match[1];
			}
		}
	}

	function applyVolumeRegex() {
		if (!volumeRegex.trim()) return;

		const flags = volumeCaseSensitive ? '' : 'i';
		const regex = new RegExp(volumeRegex, flags);
		const start = (volumeRange.start ?? 1) - 1;
		const end = (volumeRange.end ?? chapterStates.length) - 1;

		for (let i = start; i <= end; i++) {
			const chapter = chapterStates[i];
			if (!chapter.originalFolderPath) continue;
			// Skip if volume was manually edited
			if (chapter.manuallyEditedFields.has('volume')) continue;

			const match = chapter.originalFolderPath.match(regex);
			if (match && match[1]) {
				// handle leading zeros
				chapter.chapterVolume = match[1].replace(/^0+/, '');
			}
		}
	}

	function applyChapterNumberRegex() {
		if (!chapterRegex.trim()) return;

		const flags = chapterCaseSensitive ? '' : 'i';
		const regex = new RegExp(chapterRegex, flags);
		const start = (chapterNumberRange.start ?? 1) - 1;
		const end = (chapterNumberRange.end ?? chapterStates.length) - 1;

		for (let i = start; i <= end; i++) {
			const chapter = chapterStates[i];
			if (!chapter.originalFolderPath) continue;
			// Skip if chapterNumber was manually edited
			if (chapter.manuallyEditedFields.has('chapterNumber')) continue;

			const match = chapter.originalFolderPath.match(regex);
			if (match && match[1]) {
				// handle leading zeros
				chapter.chapterNumber = match[1].replace(/^0+/, '');
			}
		}
	}

	function resetTitles() {
		chapterStates.forEach((chapter) => {
			// Skip if title was manually edited
			if (chapter.manuallyEditedFields.has('title')) return;
			chapter.chapterTitle = chapter.originalFolderPath?.split('/').pop() ?? '';
		});
	}

	function clearTitles() {
		chapterStates.forEach((chapter) => {
			// Skip if title was manually edited
			if (chapter.manuallyEditedFields.has('title')) return;
			chapter.chapterTitle = '';
		});
	}

	function applyGroupsToRange() {
		const start = (groupRange.start ?? 1) - 1;
		const end = (groupRange.end ?? chapterStates.length) - 1;
		const groupIds = groups.groupIds ?? [];

		for (let i = start; i <= end; i++) {
			const chapter = chapterStates[i];
			// Skip if groups were manually edited
			if (chapter.manuallyEditedFields.has('groups')) continue;
			chapter.associatedGroup.groupIds = [...groupIds];
		}
	}

	function appendGroupsToRange() {
		const start = (groupRange.start ?? 1) - 1;
		const end = (groupRange.end ?? chapterStates.length) - 1;
		const groupIds = groups.groupIds ?? [];

		for (let i = start; i <= end; i++) {
			const chapter = chapterStates[i];
			// Skip if groups were manually edited
			if (chapter.manuallyEditedFields.has('groups')) continue;

			const existing = chapter.associatedGroup.groupIds ?? [];
			const newGroups = [...existing, ...groupIds];
			const uniqueGroups = [...new Set(newGroups)];
			chapter.associatedGroup.groupIds = uniqueGroups;
		}
	}
</script>

<div class="flex flex-col gap-2">
	<p>
		Here you have the ability to batch apply changes to all chapters at once.
		<br />
		For title / volume / chapter number extraction, Regex is used, where the first capture group will
		be used to set the value. You can use as many non-capturing groups as you want, and they will be
		ignored.
		<br />
		Should batch editing not be enough, you can manually edit each chapter property individually by clicking
		on it, including removing pages (click on a chapter and it'll expand to show the pages).
		<br />
		You are also able to assign groups to chapters, but for this you first need to register them with
		Group Preparation above.
		<br />
		Groups will be applied to all chapters by default, or to the range if specified (values are inclusive)
		<br />
		Some regexes are prefilled for you, but you can change them for your specific needs.
	</p>

	<div class="flex flex-row gap-5 bg-gray-100 rounded-md p-2 mb-10 items-center">
		<p class="font-bold">Quick unfuckup actions:</p>

		<button
			type="button"
			class="cursor-pointer bg-gray-500 hover:bg-gray-600 text-white rounded-md px-2 py-1"
			onclick={clearTitles}
		>
			Clear Titles
		</button>
		<button
			type="button"
			class="cursor-pointer bg-gray-500 hover:bg-gray-600 text-white rounded-md px-2 py-1"
			onclick={resetTitles}
		>
			Reset Titles
		</button>
	</div>

	<!-- Title Regex -->
	<form
		onsubmit={(e) => {
			applyTitleRegex();
			e.preventDefault();
		}}
		class="flex flex-row gap-2 bg-gray-100 rounded-md p-2 items-center justify-between"
	>
		<div class="flex flex-row gap-2 items-center grow-1">
			<p class="font-bold">Extract Title Regex:</p>
			<input
				type="text"
				bind:value={titleRegex}
				placeholder="^(.+?)\s+-\s+Vol"
				class="border grow-1 bg-white border-gray-300 rounded-md p-1"
			/>
		</div>

		<div class="flex flex-row gap-2 items-center">
			<label class="flex flex-row gap-1 items-center whitespace-nowrap mr-3">
				<input type="checkbox" bind:checked={titleCaseSensitive} class="w-5 h-5" />
				<span>Case Sensitive</span>
			</label>

			<RangeProvider
				bind:rangeStart={titleRange.start}
				bind:rangeEnd={titleRange.end}
				min={1}
				max={chapterStates.length}
			/>

			<button
				type="submit"
				class="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white rounded-md px-2 py-1"
			>
				Apply
			</button>
		</div>
	</form>

	<!-- Volume Regex -->
	<form
		onsubmit={(e) => {
			applyVolumeRegex();
			e.preventDefault();
		}}
		class="flex flex-row gap-2 bg-gray-100 rounded-md p-2 items-center justify-between"
	>
		<div class="flex flex-row gap-2 items-center grow-1">
			<p class="font-bold">Extract Volume Regex:</p>
			<input
				type="text"
				bind:value={volumeRegex}
				placeholder="Vol\.? ?(\d+)"
				class="border grow-1 bg-white border-gray-300 rounded-md p-1"
			/>
		</div>

		<div class="flex flex-row gap-2 items-center">
			<label class="flex flex-row gap-1 items-center whitespace-nowrap mr-3">
				<input type="checkbox" bind:checked={volumeCaseSensitive} class="w-5 h-5" />
				<span>Case Sensitive</span>
			</label>

			<RangeProvider
				bind:rangeStart={volumeRange.start}
				bind:rangeEnd={volumeRange.end}
				min={1}
				max={chapterStates.length}
			/>

			<button
				type="submit"
				class="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white rounded-md px-2 py-1"
			>
				Apply
			</button>
		</div>
	</form>

	<!-- Chapter Number Regex -->
	<form
		onsubmit={(e) => {
			applyChapterNumberRegex();
			e.preventDefault();
		}}
		class="flex flex-row gap-2 bg-gray-100 rounded-md p-2 items-center justify-between"
	>
		<div class="flex flex-row gap-2 items-center grow-1">
			<p class="font-bold">Extract Chapter Number Regex:</p>
			<input
				type="text"
				bind:value={chapterRegex}
				placeholder="Ch\.? ?(\d+)"
				class="border grow-1 bg-white border-gray-300 rounded-md p-1"
			/>
		</div>

		<div class="flex flex-row gap-2 items-center">
			<label class="flex flex-row gap-1 items-center whitespace-nowrap mr-3">
				<input type="checkbox" bind:checked={chapterCaseSensitive} class="w-5 h-5" />
				<span>Case Sensitive</span>
			</label>

			<RangeProvider
				bind:rangeStart={chapterNumberRange.start}
				bind:rangeEnd={chapterNumberRange.end}
				min={1}
				max={chapterStates.length}
			/>

			<button
				type="submit"
				class="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white rounded-md px-2 py-1"
			>
				Apply
			</button>
		</div>
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
			<RangeProvider
				bind:rangeStart={groupRange.start}
				bind:rangeEnd={groupRange.end}
				min={1}
				max={chapterStates.length}
			/>

			<button
				type="submit"
				class="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white rounded-md px-2 py-1"
			>
				Set Group(s)
			</button>

			<button
				type="button"
				class="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white rounded-md px-2 py-1"
				onclick={appendGroupsToRange}
			>
				Append Group(s)
			</button>
		</div>
	</form>
</div>
