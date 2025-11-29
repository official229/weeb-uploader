<script lang="ts">
	import DirectoryExplorer from '$lib/components/VerticalSlicerComponents/DirectoryExplorer.svelte';
	import { groupFilesByFolders, SelectedFolder } from '$lib/core/GroupedFolders';
	import VerticalSlicePane from './VerticalSlicePane.svelte';
	import VerticalSlicePreview from './VerticalSlicePreview.svelte';
	import type { VerticalSliceSelection } from './VerticalSliceTypes.svelte';

	interface Props {
		selectedFiles: File[] | null;
		finalizedFolderSelection: SelectedFolder[] | null;
		class?: string;
	}

	let {
		selectedFiles,
		finalizedFolderSelection = $bindable<SelectedFolder[] | null>(null),
		class: className = ''
	}: Props = $props();

	let slicedFolders = $state<SelectedFolder[] | null>(null);
	let selectedSlicedFolders = $state<VerticalSliceSelection[]>([]);
	let activeSelectedSlicedFolders = $derived.by(() =>
		selectedSlicedFolders.filter((folder) => folder.isSelected)
	);

	let groupedFolder = $derived.by(() => groupFilesByFolders(selectedFiles ?? []));

	let verticalSliceRef = $state<HTMLDivElement | null>(null);
	let isDragging = $state(false);
	let leftWidth = $state(20); // percentage

	function onSubmit() {
		finalizedFolderSelection = slicedFolders;
	}

	function handleMouseDown(e: MouseEvent) {
		isDragging = true;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging || !verticalSliceRef) return;

		const rect = verticalSliceRef.getBoundingClientRect();
		const newWidth = ((e.clientX - rect.left) / rect.width) * 100;

		// Constrain between 20% and 80% to prevent either side from being too small
		leftWidth = Math.max(20, Math.min(80, newWidth));
	}

	function handleMouseUp() {
		isDragging = false;
	}

	$effect(() => {
		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			document.body.style.cursor = 'col-resize';
			document.body.style.userSelect = 'none';

			return () => {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
				document.body.style.cursor = '';
				document.body.style.userSelect = '';
			};
		}
	});
</script>

<div class="flex flex-col gap-2 {className}">
	<h1 class="text-xl font-bold">Vertical Slicer</h1>

	<div class="flex flex-row h-full w-full gap-1">
		<!-- Left Panel: Directory Explorer -->
		<div style="width: {leftWidth}%;">
			<h2 class="text-md font-bold text-right">Directory Explorer</h2>
		</div>

		<div class="w-2"></div>

		<!-- Right Panel -->
		<div class="flex flex-1">
			<h2 class="text-md font-bold">Slicer</h2>
		</div>
	</div>

	<div bind:this={verticalSliceRef} class="h-full max-h-100 w-full flex gap-1">
		<!-- Left Panel: Directory Explorer -->
		<div style="width: {leftWidth}%;" class="overflow-auto">
			<DirectoryExplorer folder={groupedFolder} />
		</div>

		<!-- Resize Handle -->
		<button
			type="button"
			class="w-2 bg-gray-300 clickable-hint cursor-col-resize relative group border-0 p-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
			onmousedown={handleMouseDown}
			aria-label="Resize panels"
		>
			<!-- Visual indicator dots -->
			<div
				class="absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
			>
				<div class="w-0.5 h-0.5 bg-gray-500 dark:bg-gray-400 rounded-full"></div>
				<div class="w-0.5 h-0.5 bg-gray-500 dark:bg-gray-400 rounded-full"></div>
				<div class="w-0.5 h-0.5 bg-gray-500 dark:bg-gray-400 rounded-full"></div>
			</div>
		</button>

		<!-- Right Panel -->
		<div class="flex flex-1 overflow-auto">
			<VerticalSlicePane selectedFolder={groupedFolder} bind:slicedFolders />
		</div>
	</div>

	{#if slicedFolders}
		<div>
			<h2 class="text-md font-bold">
				Vertical Slice Preview ({activeSelectedSlicedFolders.length}
				selected)
			</h2>
			<VerticalSlicePreview
				{slicedFolders}
				bind:selectedSlicedFolders
				class="max-h-100 overflow-scroll"
			/>
		</div>

		<button
			type="button"
			class="cursor-pointer w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			disabled={activeSelectedSlicedFolders.length === 0}
			onclick={onSubmit}
		>
			Continue to uploader
		</button>
	{/if}
</div>
