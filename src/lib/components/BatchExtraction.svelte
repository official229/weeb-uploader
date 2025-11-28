<script lang="ts">
	interface Props {
		onApply: (titleRegex: string, volumeRegex: string, numberRegex: string) => void;
	}

	let { onApply }: Props = $props();

	let titleRegex = $state('');
	let volumeRegex = $state('');
	let numberRegex = $state('');

	function apply() {
		onApply(titleRegex, volumeRegex, numberRegex);
	}
</script>

<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
	<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
		Batch Extract from Folder Names
	</h3>
	<div class="space-y-4">
		<!-- Title Regex -->
		<div>
			<label
				for="title-regex"
				class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
			>
				Title Regex Pattern
			</label>
			<div class="flex gap-2">
				<input
					id="title-regex"
					type="text"
					bind:value={titleRegex}
					placeholder="e.g., ^(.+?)\s+-\s+Vol"
					class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				<button
					type="button"
					onclick={apply}
					class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors font-medium"
				>
					Extract All
				</button>
			</div>
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
				Use capture group (parentheses) to extract the title. Skips manually edited chapters.
			</p>
		</div>

		<!-- Volume Regex -->
		<div>
			<label
				for="volume-regex"
				class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
			>
				Volume Regex Pattern
			</label>
			<div class="flex gap-2">
				<input
					id="volume-regex"
					type="text"
					bind:value={volumeRegex}
					placeholder="e.g., Vol\.\s*(\d+)"
					class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				<button
					type="button"
					onclick={apply}
					class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors font-medium"
				>
					Extract All
				</button>
			</div>
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
				Use capture group to extract volume number. Skips manually edited chapters.
			</p>
		</div>

		<!-- Number Regex -->
		<div>
			<label
				for="number-regex"
				class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
			>
				Chapter Number Regex Pattern
			</label>
			<div class="flex gap-2">
				<input
					id="number-regex"
					type="text"
					bind:value={numberRegex}
					placeholder="e.g., Ch\.\s*(\d+)"
					class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				<button
					type="button"
					onclick={apply}
					class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors font-medium"
				>
					Extract All
				</button>
			</div>
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
				Use capture group to extract chapter number. Skips manually edited chapters.
			</p>
		</div>
	</div>
</div>

