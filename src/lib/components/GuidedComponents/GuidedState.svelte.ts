import { createContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

export enum GuidedWorkflowStep {
	SELECTING_ROOT_FOLDER = 'SELECTING_ROOT_FOLDER',
	SELECTING_MANGA_FOLDERS = 'SELECTING_MANGA_FOLDERS',
	PROCESSING_MANGA = 'PROCESSING_MANGA'
}

export enum MangaProcessingStatus {
	PENDING = 'PENDING',
	PROCESSING = 'PROCESSING',
	COMPLETED = 'COMPLETED',
	ERROR = 'ERROR'
}

export interface ZipFileInfo {
	file: File;
	mangaFolderName: string;
	mangaFolderPath: string;
	status: MangaProcessingStatus;
}

export class GuidedState {
	public rootFolderFiles = $state<File[] | null>(null);
	public zipFiles = $state<ZipFileInfo[]>([]); // All zip files found
	public selectedZipFiles = $state<File[]>([]); // Selected zip files to process
	public currentZipIndex = $state<number>(-1);
	public workflowStep = $state<GuidedWorkflowStep>(GuidedWorkflowStep.SELECTING_ROOT_FOLDER);

	public get currentZip(): ZipFileInfo | null {
		if (this.currentZipIndex < 0 || this.currentZipIndex >= this.zipFiles.length) {
			return null;
		}
		return this.zipFiles[this.currentZipIndex];
	}

	public get unprocessedZips(): ZipFileInfo[] {
		return this.zipFiles.filter(
			(zip) =>
				this.selectedZipFiles.includes(zip.file) && zip.status === MangaProcessingStatus.PENDING
		);
	}

	public get nextZip(): ZipFileInfo | null {
		const unprocessed = this.unprocessedZips;
		if (unprocessed.length === 0) {
			return null;
		}
		// Return the first unprocessed zip
		return unprocessed[0];
	}

	public setZipStatus(zipFile: File, status: MangaProcessingStatus) {
		const zipInfo = this.zipFiles.find((z) => z.file === zipFile);
		if (zipInfo) {
			zipInfo.status = status;
		}
	}

	public moveToNextZip(): boolean {
		const next = this.nextZip;
		if (!next) {
			return false;
		}
		const index = this.zipFiles.findIndex((z) => z.file === next.file);
		if (index >= 0) {
			this.currentZipIndex = index;
			return true;
		}
		return false;
	}

	// Helper to get zip files grouped by manga folder
	public get zipFilesByMangaFolder(): SvelteMap<string, ZipFileInfo[]> {
		const map = new SvelteMap<string, ZipFileInfo[]>();
		for (const zipInfo of this.zipFiles) {
			if (!map.has(zipInfo.mangaFolderName)) {
				map.set(zipInfo.mangaFolderName, []);
			}
			map.get(zipInfo.mangaFolderName)!.push(zipInfo);
		}
		return map;
	}

	public reset() {
		this.rootFolderFiles = null;
		this.zipFiles = [];
		this.selectedZipFiles = [];
		this.currentZipIndex = -1;
		this.workflowStep = GuidedWorkflowStep.SELECTING_ROOT_FOLDER;
	}
}

export const guidedStateContext = createContext<GuidedState>();
