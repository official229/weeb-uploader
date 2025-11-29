import axios from 'axios';
import type { ChapterState } from './UploadingState.svelte';
import { ChapterStatus, ChapterPageStatus } from './UploadingState.svelte';
import { RATE_LIMITER_SESSION } from './ApiWithRateLimit.svelte';

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
			// check for any preexisting upload sessions and delete them
			await this.deletePreexistingUploadSessions();

			const chaptersToUpload = this.chapters.filter(
				(chapter) => chapter.status !== ChapterStatus.COMPLETED
			);

			// Upload chapters one at a time
			for (let i = 0; i < chaptersToUpload.length; i++) {
				this.currentChapterIndex = i;
				const chapter = chaptersToUpload[i];

				// Skip if already completed
				if (chapter.status === ChapterStatus.COMPLETED) {
					this.checkProgress();
					continue;
				}

				// Upload the chapter
				await chapter.upload(this.authToken);

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

	private async deletePreexistingUploadSessions(): Promise<void> {
		const response = await RATE_LIMITER_SESSION.makeRequest(() =>
			axios.get(`https://api.weebdex.org/upload`, {
				headers: {
					Authorization: `Bearer ${this.authToken}`
				}
			})
		);

		if (response.status === 204) {
			return;
		}

		if (response.status === 200) {
			const data = response.data;
			if (!data.id || typeof data.id !== 'string') {
				return;
			}

			await RATE_LIMITER_SESSION.makeRequest(() =>
				axios.delete(`https://api.weebdex.org/upload/${data.id}`, {
					headers: {
						Authorization: `Bearer ${this.authToken}`
					}
				})
			);
		}
	}
}
