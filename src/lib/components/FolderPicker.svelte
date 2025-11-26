<script lang="ts">
	interface Props {
		files: File[] | null;
	}

	let { files = $bindable<File[] | null>(null) }: Props = $props();

	const handleChangeFiles = (event: Event) => {
		const input = event.target as HTMLInputElement;
		files = Array.from(input.files ?? []);
	};
</script>



<h1 class="text-2xl font-bold">Folder Picker</h1>
<input class="p-2 b-gray b-2 rounded-md" type="file" webkitdirectory={true} multiple={true} onchange={handleChangeFiles} />


