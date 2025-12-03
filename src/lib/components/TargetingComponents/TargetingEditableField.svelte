<script lang="ts">
	interface Props {
		value: string | null;
		class?: string;
		textClass?: string;
	}

	let {
		value: boundValue = $bindable<string | null>(null),
		class: className = '',
		textClass = ''
	}: Props = $props();

	let isEditing = $state(false);
	let editValue = $state<string | null>(null);
	let inputRef = $state<HTMLInputElement | null>(null);

	function startEditing() {
		isEditing = true;
		editValue = boundValue;
	}

	$effect(() => {
		if (inputRef && isEditing) {
			inputRef.focus();

			window.addEventListener('keydown', handleKeyDown);
		} else {
			window.removeEventListener('keydown', handleKeyDown);
		}
	});

	function stopEditing(commit: boolean) {
		isEditing = false;
		if (commit) {
			boundValue = editValue;
		} else {
			editValue = boundValue;
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			stopEditing(false);
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class={['flex flex-row gap-2 items-center', className]} onclick={(e) => e.stopPropagation()}>
	{#if isEditing}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				stopEditing(true);
			}}
			class="flex flex-row gap-2 items-center w-full"
		>
			<input
				bind:this={inputRef}
				type="text"
				bind:value={editValue}
				class="w-full border border-gray-500 rounded-md p-1 bg-white"
			/>
			<button
				onclick={(e) => {
					e.stopPropagation();
					stopEditing(false);
				}}
				type="button"
				aria-label="Cancel"
				class="cursor-pointer bg-red-500 rounded-md p-1"
			>
				<div class="i-mdi-close h-5 w-5 text-white"></div>
			</button>
			<button type="submit" aria-label="Save" class="cursor-pointer bg-green-500 rounded-md p-1">
				<div class="i-mdi-check h-5 w-5 text-white"></div>
			</button>
		</form>
	{:else}
		<button
			onclick={(e) => {
				e.stopPropagation();
				startEditing();
			}}
			class={[
				'cursor-pointer hover:text-blue-500 px-2 min-w-5 min-h-5 bg-gray-100 rounded-md',
				textClass
			]}
		>
			{boundValue ?? '—'}
		</button>
	{/if}
</div>
