import { DateTime, Duration } from 'luxon';
import { sleep } from './Utils';
import { AxiosError } from 'axios';

export class ApiWithRateLimit {
	private rateLimit: number;
	private rateLimitInterval: Duration;
	private lastRequestTime: DateTime;
	private lastBucketStart: DateTime;
	private requestCount: number;

	public constructor(rateLimit: number, rateLimitIntervalSeconds: number) {
		this.rateLimit = rateLimit;
		this.rateLimitInterval = Duration.fromDurationLike({ seconds: rateLimitIntervalSeconds });
		this.lastRequestTime = DateTime.now();
		this.lastBucketStart = DateTime.now();
		this.requestCount = 0;
	}

	public async makeRequest<T>(method: () => Promise<T>): Promise<T> {
		const now = DateTime.now();
		const timeSinceLastBucketStart = now.diff(this.lastBucketStart);

		// new bucket started, reset everything
		if (timeSinceLastBucketStart > this.rateLimitInterval) {
			this.lastRequestTime = now;
			this.lastBucketStart = now;
			this.requestCount = 1;
			return this.runRequestWith429Wrapper(method);
		}

		// rate limit exceeded, wait for the next bucket to start
		if (this.requestCount >= this.rateLimit) {
			const nextBucketStart = this.lastBucketStart.plus(this.rateLimitInterval);
			const timeUntilNextBucketStart = nextBucketStart.diff(now);
			await sleep(timeUntilNextBucketStart.toMillis());

			this.lastRequestTime = now;
			this.lastBucketStart = now;
			this.requestCount = 1;
			return this.runRequestWith429Wrapper(method);
		}

		// request count is within the limit, make the request
		this.requestCount++;
		this.lastRequestTime = now;
		return this.runRequestWith429Wrapper(method);
	}

	private async runRequestWith429Wrapper<T>(method: () => Promise<T>): Promise<T> {
		try {
			return await method();
		} catch (error) {
			console.warn('Hit error in bucket, retrying...', error);
			if (error instanceof AxiosError && error.response?.status === 429) {
				return this.makeRequest(method);
			}
			throw error;
		}
	}
}

export const RATE_LIMITER_SESSION = new ApiWithRateLimit(20, 60);
export const RATE_LIMITER_UPLOAD = new ApiWithRateLimit(2, 5);
