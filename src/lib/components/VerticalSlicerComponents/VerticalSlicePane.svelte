<script lang="ts">
	import { getFoldersAtDepth, SelectedFile, SelectedFolder } from '$lib/core/GroupedFolders';
	import DropdownSingleSelector from '../Common/DropdownSingleSelector.svelte';

	interface Props {
		selectedFolder: SelectedFolder;
		slicedFolders: SelectedFolder[] | null;
		class?: string;
	}

	let {
		selectedFolder,
		class: className = '',
		slicedFolders = $bindable<SelectedFolder[] | null>(null)
	}: Props = $props();

	let maximumLevels = $derived(selectedFolder.depth);

	let chapterNameLevel = $state<string>('1');
	let fileLevel = $state<string>('1');
	let filePathFilter = $state<string>('');

	$effect(() => {
		if (chapterNameLevel && fileLevel && parseInt(fileLevel) < parseInt(chapterNameLevel)) {
			fileLevel = chapterNameLevel;
		}

		const foldersAtChapterNameLevel = getFoldersAtLevel(parseInt(chapterNameLevel), selectedFolder);
		const filteredFolders = filterFilesByPath(foldersAtChapterNameLevel, filePathFilter);

		// natural sort the folders
		filteredFolders.sort((a, b) => a.name.localeCompare(b.name));

		slicedFolders = filteredFolders;
	});

	function getFoldersAtLevel(level: number, fromFolder: SelectedFolder) {
		let foldersMatched: SelectedFolder[] = [];

		for (const folder of fromFolder.folders) {
			// we're at the level we're looking for
			if (folder.level === level) {
				foldersMatched.push(folder);
				continue;
			}

			// we're looking for a deeper level, so we need to recurse
			if (folder.level < level) {
				foldersMatched.push(...getFoldersAtLevel(level, folder));
			}
		}

		return foldersMatched;
	}

	function getFilesFromFolder(folder: SelectedFolder) {
		const folderFiles = folder.files;

		let nestedFiles: SelectedFile[] = [];
		for (const nestedFolder of folder.folders) {
			nestedFiles.push(...getFilesFromFolder(nestedFolder));
		}

		return [...folderFiles, ...nestedFiles];
	}

	function filterFilesByPath(folders: SelectedFolder[], regex: string) {
		// figure out if we have a regex even
		if (!regex.trim()) {
			return folders;
		}

		const filterRegex = new RegExp(regex.trim());

		// we go over all folders and filter the files by the regex
		let filteredFolders: SelectedFolder[] = [];
		for (const folder of folders) {
			const files = getFilesFromFolder(folder);
			const validFiles = files.filter((file) => filterRegex.test(file.path));

			// if we have no valid files, we can ignore this folder
			if (validFiles.length === 0) {
				continue;
			}

			// we can ignore any nested folders at this level, we're at a point where we only care about the files
			filteredFolders.push(
				new SelectedFolder(folder.name, folder.path, validFiles, [], folder.level, 0)
			);
		}

		return filteredFolders;
	}
</script>

<div class={['flex flex-col gap-2', className]}>
	<h2 class="text-md font-bold">Vertical Slice Pane - {maximumLevels}</h2>

	<div class="grid grid-cols-2 gap-2">
		<div class="flex flex-col gap-2 justify-between p-4 bg-gray-50 rounded-lg">
			<div>
				<h3 class="text-sm font-bold">Chapter Name Level</h3>
				<p class="text-sm text-gray-500">
					This is the level at which folders will be grouped into chapters (the L numbering on the
					directory explorer). The folders at this level will be used to group together chapters.
				</p>
			</div>
			<DropdownSingleSelector
				items={Array.from({ length: maximumLevels }, (_, i) => i + 1).map((level) =>
					level.toString()
				)}
				bind:selectedItem={chapterNameLevel}
				class="w-full"
			/>
		</div>

		<div class="flex flex-col gap-2 justify-between p-4 bg-gray-50 rounded-lg">
			<div>
				<h3 class="text-sm font-bold">File Level</h3>
				<p class="text-sm text-gray-500">
					This is the level at which files inside folders will be considered as being a part of the
					chapter (the L numbering on the directory explorer). Only files contained within folders
					at this level will be considered as being a part of the chapter.
				</p>
			</div>
			<DropdownSingleSelector
				items={Array.from({ length: maximumLevels }, (_, i) => i + 1).map((level) =>
					level.toString()
				)}
				bind:selectedItem={fileLevel}
				class="w-full"
			/>
		</div>
	</div>

	<div class="flex flex-col gap-2 justify-between p-4 bg-gray-50 rounded-lg">
		<div>
			<h3 class="text-sm font-bold">File Path Filter</h3>
			<p class="text-sm text-gray-500">
				This is a regex filter that will be applied in addition to the file level selector. This is
				useful if you have multiple files at the same file level, but are only really interested in
				a subset of them.
			</p>
		</div>
		<input
			type="text"
			bind:value={filePathFilter}
			placeholder="Filter files by path regex..."
			class="w-full px-2 py-1 border border-gray-300 rounded-md"
		/>
	</div>
</div>
