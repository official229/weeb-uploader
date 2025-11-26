<script lang="ts">
	import type { SelectedFolder } from '$lib/core/GroupedFolders';

	interface FileItem {
		file: SelectedFolder['files'][0];
		folder: SelectedFolder;
	}

	interface Props {
		files: FileItem[];
		onRemove?: (fileIndex: number, event: Event) => void;
	}

	let { files, onRemove }: Props = $props();

	function createImagePreviewUrl(file: File): string {
		return URL.createObjectURL(file);
	}

	// Cleanup object URLs when component is destroyed
	$effect(() => {
		return () => {
			// Cleanup will happen when component is destroyed
		};
	});
</script>

<div class="p-4 bg-white dark:bg-gray-900">
	<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
		{#each files as { file, folder }, fileIndex}
			{@const previewUrl = createImagePreviewUrl(file.file)}
			<div class="relative group">
				<div class="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
					<img
						src={previewUrl}
						alt={file.file.name}
						class="w-full h-full object-cover"
						loading="lazy"
					/>
					{#if onRemove}
						<!-- Remove file button overlay -->
						<button
							type="button"
							onclick={(e) => onRemove?.(fileIndex, e)}
							class="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
							title="Remove file"
						>
							<span class="i-mdi-close text-sm"></span>
						</button>
					{/if}
				</div>
				<div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
					<span class="text-white text-xs text-center px-2 line-clamp-2">
						{file.file.name}
					</span>
				</div>
				<div class="mt-1 text-xs text-gray-600 dark:text-gray-400 truncate" title={file.file.name}>
					{file.file.name}
				</div>
			</div>
		{/each}
	</div>
</div>

