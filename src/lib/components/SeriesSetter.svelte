<script lang="ts">
	import { getContext } from 'svelte';
	import { GlobalState, globalStateContext } from '$lib/core/GlobalState.svelte';

	interface MangaData {
		id: string;
		title: string;
		description: string;
		relationships: {
			cover?: {
				id: string;
				ext: string;
				dimensions: number[];
			};
		};
	}

	const globalState = getContext(globalStateContext) as GlobalState;
	if (!globalState) {
		throw new Error(
			'SeriesSetter must be used within a component that provides GlobalState context'
		);
	}

	let inputValue = $state('');
	let isValidating = $state(false);
	let validationError = $state<string | null>(null);
	let mangaData = $state<MangaData | null>(null);

	// Computed derived state for series ID
	const seriesId = $derived(globalState.seriesId);

	// Load manga data if seriesId is already set (e.g., on page reload)
	$effect(() => {
		if (globalState.seriesId && !mangaData) {
			loadMangaData(globalState.seriesId);
		}
	});

	async function loadMangaData(id: string) {
		isValidating = true;
		validationError = null;

		try {
			const response = await fetch(`https://api.weebdex.org/manga/${id}`);

			if (response.ok) {
				const data = await response.json();
				mangaData = data;
				validationError = null;
			} else {
				validationError = `Series not found: ${response.status} ${response.statusText}`;
				globalState.seriesId = null;
				mangaData = null;
			}
		} catch (error) {
			validationError = error instanceof Error ? error.message : 'Failed to load series';
			globalState.seriesId = null;
			mangaData = null;
		} finally {
			isValidating = false;
		}
	}

	async function validateSeries() {
		if (!inputValue.trim()) {
			validationError = 'Please enter a series ID';
			return;
		}

		await loadMangaData(inputValue.trim());
		if (mangaData) {
			globalState.seriesId = inputValue.trim();
		}
	}

	function reset() {
		inputValue = '';
		globalState.seriesId = null;
		validationError = null;
		mangaData = null;
	}

	function getCoverUrl(): string | null {
		if (!mangaData?.relationships?.cover?.id || !globalState.seriesId) {
			return null;
		}
		return `https://srv.notdelta.xyz/covers/${globalState.seriesId}/${mangaData.relationships.cover.id}.256.webp`;
	}
</script>

<div class="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
	<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Series Selection</h2>

	{#if seriesId && mangaData}
		<div class="space-y-4">
			<div
				class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
			>
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						<svg
							class="w-5 h-5 text-green-600 dark:text-green-400"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
						<span class="text-green-800 dark:text-green-200 font-medium"
							>Series validated successfully</span
						>
					</div>
					<button
						type="button"
						onclick={reset}
						class="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded transition-colors"
					>
						Reset
					</button>
				</div>
				<div class="flex gap-4">
					{#if getCoverUrl()}
						<img
							src={getCoverUrl()}
							alt={mangaData.title || 'Cover'}
							class="w-32 h-auto rounded-lg object-cover shadow-md flex-shrink-0"
						/>
					{/if}
					<div class="flex-1 min-w-0">
						<h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
							{mangaData.title || 'Untitled'}
						</h3>
						{#if mangaData.description}
							<div class="prose prose-sm dark:prose-invert max-w-none">
								<p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
									{mangaData.description}
								</p>
							</div>
						{:else}
							<p class="text-gray-500 dark:text-gray-400 italic">No description available</p>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="space-y-3">
			<div>
				<label
					for="series-id-input"
					class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
				>
					Series ID
				</label>
				<input
					id="series-id-input"
					type="text"
					bind:value={inputValue}
					placeholder="Enter series ID"
					disabled={isValidating}
					class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
					onkeydown={(e) => {
						if (e.key === 'Enter' && !isValidating && inputValue.trim()) {
							validateSeries();
						}
					}}
				/>
			</div>

			{#if validationError}
				<div
					class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
				>
					<p class="text-sm text-red-800 dark:text-red-200">{validationError}</p>
				</div>
			{/if}

			<button
				type="button"
				onclick={validateSeries}
				disabled={isValidating || !inputValue.trim()}
				class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
			>
				{#if isValidating}
					<svg
						class="animate-spin h-5 w-5"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					<span>Validating...</span>
				{:else}
					<span>Validate Series</span>
				{/if}
			</button>
		</div>
	{/if}
</div>
