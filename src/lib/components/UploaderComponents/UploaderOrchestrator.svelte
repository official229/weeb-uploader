<script lang="ts">
	import { getContext } from 'svelte';
	import {
		TargetingState,
		targetingStateContext
	} from '../TargetingComponents/TargetingState.svelte';
	import UploaderChapterProgression from './UploaderChapterProgression.svelte';

	const targetingState = getContext<TargetingState>(targetingStateContext);
	if (!targetingState) {
		throw new Error(
			'UploaderOrchestrator must be used within a component that provides TargetingState context'
		);
	}

	let chapters = $derived(targetingState.chapterStates);

	interface Props {
		onDone: () => void;
	}

	let { onDone }: Props = $props();
</script>

<div>
	<p>uploader orchestrator</p>

	{#each chapters as chapter, index}
		<UploaderChapterProgression {chapter} />
	{/each}
</div>
