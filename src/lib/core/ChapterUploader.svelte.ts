import type { ChapterState } from './UploadingState.svelte';
import { ChapterStatus, ChapterPageStatus } from './UploadingState.svelte';
import { sleep } from './Utils';

export enum UploaderStatus {
	NOT_STARTED = 'NOT_STARTED',
	IN_PROGRESS = 'IN_PROGRESS',
	COMPLETED = 'COMPLETED',
	FAILED = 'FAILED'
}

export class ChapterUploader {
	public chapters = $state<ChapterState[]>([]);
	public status = $state<UploaderStatus>(UploaderStatus.NOT_STARTED);
	public progress = $state<number>(0); // 0 - 1 normalized progress
	public error = $state<string | null>(null);
	public currentChapterIndex = $state<number>(-1);
	public authToken = $state<string | null>(null);

	public constructor(chapters: ChapterState[], authToken: string | null = null) {
		this.chapters = chapters;
		this.authToken = authToken;
		this.status = UploaderStatus.NOT_STARTED;
		this.progress = 0;
		this.error = null;
		this.currentChapterIndex = -1;
	}

	public checkProgress(): void {
		const totalChapters = this.chapters.length;
		if (totalChapters === 0) {
			this.progress = 0;
			return;
		}

		// Calculate progress based on actual chapter states
		const progressTotal = this.chapters.reduce((sum, chapter) => sum + chapter.progress, 0);
		this.progress = progressTotal / totalChapters;
	}

	public async uploadAll(): Promise<void> {
		if (this.status === UploaderStatus.IN_PROGRESS) {
			return; // Already uploading
		}

		if (!this.authToken) {
			this.status = UploaderStatus.FAILED;
			this.error = 'No authentication token provided';
			this.progress = 0;
			return;
		}

		if (this.chapters.length === 0) {
			this.status = UploaderStatus.FAILED;
			this.error = 'No chapters to upload';
			this.progress = 0;
			return;
		}

		this.status = UploaderStatus.IN_PROGRESS;
		this.progress = 0;
		this.error = null;
		this.currentChapterIndex = 0;

		try {
			// Upload chapters one at a time
			for (let i = 0; i < this.chapters.length; i++) {
				this.currentChapterIndex = i;
				const chapter = this.chapters[i];

				// Skip if already completed
				if (chapter.status === ChapterStatus.COMPLETED) {
					this.checkProgress();
					continue;
				}

				// Upload the chapter
				await chapter.upload(this.authToken);

				await sleep(2000);

				// Check if upload failed
				if (chapter.status === ChapterStatus.FAILED) {
					this.status = UploaderStatus.FAILED;
					this.error =
						chapter.error || `Failed to upload chapter: ${chapter.chapterTitle || 'Unknown'}`;
					this.progress = 0;
					return;
				}

				// Update overall progress
				this.checkProgress();
			}

			// All chapters completed successfully
			this.status = UploaderStatus.COMPLETED;
			this.progress = 1;
			this.error = null;
		} catch (error) {
			this.status = UploaderStatus.FAILED;
			this.progress = 0;

			if (error instanceof Error) {
				this.error = error.message;
			} else {
				this.error = 'Unknown error occurred during upload';
			}
		}
	}

	public reset(): void {
		this.status = UploaderStatus.NOT_STARTED;
		this.progress = 0;
		this.error = null;
		this.currentChapterIndex = -1;

		// Reset all chapters
		for (const chapter of this.chapters) {
			chapter.status = ChapterStatus.NOT_STARTED;
			chapter.progress = 0;
			chapter.error = null;
			chapter.associatedUploadSessionId = null;

			// Reset all pages
			for (const page of chapter.pages) {
				page.status = ChapterPageStatus.NOT_STARTED;
				page.progress = 0;
				page.error = null;
				page.associatedUploadSessionFileId = null;
			}
		}
	}
}
