<script lang="ts">
	import { ApiAuthContext, apiAuthContext } from '$lib/core/GlobalState.svelte';
	import { getContext } from 'svelte';
	import {
		TargetingState,
		targetingStateContext,
		type MangaData
	} from '$lib/components/TargetingComponents/TargetingState.svelte';

	const API_ENDPOINT = 'https://api.weebdex.org/manga';

	const authContext = getContext<ApiAuthContext>(apiAuthContext);
	if (!authContext) {
		throw new Error(
			'TargetingSeriesValidator must be used within a component that provides ApiAuthContext context'
		);
	}

	const targetingState = getContext<TargetingState>(targetingStateContext);
	if (!targetingState) {
		throw new Error(
			'TargetingSeriesValidator must be used within a component that provides TargetingState context'
		);
	}

	let inputValue = $state('');
	let isValidating = $state(false);
	let validationError = $state<string | null>(null);
	let seriesData = $state<MangaData | null>(null);

	function setSeriesId(id: string) {
		targetingState.seriesId = id;
	}

	function getCoverUrl(): string | null {
		if (!seriesData?.relationships?.cover?.id || !targetingState.seriesId) {
			return null;
		}

		return `https://srv.notdelta.xyz/covers/${targetingState.seriesId}/${seriesData.relationships.cover.id}.256.webp`;
	}

	function reset() {
		inputValue = '';
		targetingState.seriesId = null;
		seriesData = null;
		validationError = null;
	}

	$effect(() => {
		if (targetingState.seriesId) {
			loadSeriesData(targetingState.seriesId);
		}
	});

	async function loadSeriesData(id: string) {
		isValidating = true;
		try {
			const response = await fetch(`https://api.weebdex.org/manga/${id}`);
			if (response.ok) {
				const data = await response.json();
				seriesData = data;
			} else {
				validationError = `Failed to load series data: ${response.status} ${response.statusText}`;
			}
		} catch (error) {
			validationError = error instanceof Error ? error.message : 'Failed to load series data';
		} finally {
			isValidating = false;
		}
	}

	async function validateSeries() {
		if (!inputValue.trim()) {
			validationError = 'Please enter a series ID';
			return;
		}

		const token = authContext.apiToken;
		if (!token) {
			validationError = 'No API token found';
			return;
		}

		isValidating = true;
		validationError = null;

		try {
			const url = `${API_ENDPOINT}/${inputValue.trim()}`;
			const response = await fetch(url, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (response.ok) {
				const data = await response.json();
				seriesData = data;
				setSeriesId(inputValue.trim());
				validationError = null;
			} else {
				validationError = `Failed to validate series: ${response.status} ${response.statusText}`;
			}
		} catch (error) {
			validationError = error instanceof Error ? error.message : 'Failed to validate series';
		} finally {
			isValidating = false;
		}
	}
</script>

<div class="flex flex-col gap-2">
	{#if seriesData}
		<div class="flex flex-col gap-2 bg-gray-100 rounded-md p-4">
			<div class="flex flex-row gap-2 items-center">
				<span class="i-mdi-check text-green-500 text-2xl"></span>
				<h3 class="text-lg font-semibold">Series Validated</h3>
				<button
					type="button"
					onclick={reset}
					class="clickable-hint rounded-md p-1"
					aria-label="Reset"
					title="Reset"
				>
					<div class="i-mdi-refresh h-5 w-5"></div>
				</button>
			</div>
			<div class="flex flex-row gap-2">
				{#if getCoverUrl()}
					<img
						src={getCoverUrl()}
						alt={seriesData.title ?? 'Cover'}
						class="w-64 h-64 object-cover"
					/>
				{:else}
					<div class="w-64 h-64 bg-gray-200 rounded-md i-mdi-image-outline"></div>
				{/if}
				<div class="flex flex-col gap-2">
					<p class="text-sm font-bold">ID: {seriesData.id}</p>
					<p class="text-sm font-bold">{seriesData.title}</p>
					<p class="text-sm text-gray-500">{seriesData.description}</p>
				</div>
			</div>
		</div>
	{:else}
		<div class="flex flex-col gap-2 bg-gray-100 rounded-md p-4">
			<div class="flex flex-row gap-2 items-center">
				<label for="series-id-input" class="text-sm font-medium">Series ID:</label>
				<input
					class="border border-gray-300 rounded-md p-2 grow-1 bg-white"
					id="series-id-input"
					type="text"
					bind:value={inputValue}
					disabled={isValidating}
					placeholder="Enter series ID"
				/>
			</div>
			<button
				class="clickable-hint p-2 rounded-md"
				type="button"
				disabled={isValidating}
				onclick={validateSeries}
			>
				Validate
			</button>
		</div>

		{#if validationError}
			<p class="text-red-500">{validationError}</p>
		{/if}
		{#if isValidating}
			<p>Validating...</p>
		{/if}
	{/if}
</div>
