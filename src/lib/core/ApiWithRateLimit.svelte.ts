import { DateTime, Duration } from 'luxon';
import { sleep } from './Utils';
import { AxiosError } from 'axios';

export class ApiWithRateLimit {
	private rateLimit: number;
	private rateLimitInterval: Duration;
	private lastRequestTime: DateTime;
	private lastBucketStart: DateTime;
	private requestCount: number;

	private chainLimits: ApiWithRateLimit[];

	public constructor(rateLimit: number, rateLimitIntervalSeconds: number) {
		this.rateLimit = rateLimit;
		this.rateLimitInterval = Duration.fromDurationLike({ seconds: rateLimitIntervalSeconds });
		this.lastRequestTime = DateTime.now();
		this.lastBucketStart = DateTime.now();
		this.requestCount = 0;
		this.chainLimits = [];
	}

	public addChainLimit(chainLimit: ApiWithRateLimit): ApiWithRateLimit {
		this.chainLimits.push(chainLimit);
		return this;
	}

	public async makeRequest<T>(method: () => Promise<T>): Promise<T> {
		const now = DateTime.now();
		const timeSinceLastBucketStart = now.diff(this.lastBucketStart);

		// new bucket started, reset everything
		if (timeSinceLastBucketStart > this.rateLimitInterval) {
			this.lastRequestTime = now;
			this.lastBucketStart = now;
			this.requestCount = 1;
			return this.runRequestWithWrapper(method);
		}

		// rate limit exceeded, wait for the next bucket to start
		if (this.requestCount >= this.rateLimit) {
			const nextBucketStart = this.lastBucketStart.plus(this.rateLimitInterval);
			const timeUntilNextBucketStart = nextBucketStart.diff(now);
			await sleep(timeUntilNextBucketStart.toMillis());

			this.lastRequestTime = now;
			this.lastBucketStart = now;
			this.requestCount = 1;
			return this.runRequestWithWrapper(method);
		}

		// request count is within the limit, make the request
		this.requestCount++;
		this.lastRequestTime = now;
		return this.runRequestWithWrapper(method);
	}

	private async runRequestWithWrapper<T>(method: () => Promise<T>): Promise<T> {
		try {
			for (const chainLimit of this.chainLimits) {
				await chainLimit.makeRequest(() => Promise.resolve());
			}
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

export const RATE_LIMITER_GLOBAL = new ApiWithRateLimit(4, 1);
export const RATE_LIMITER_SESSION = new ApiWithRateLimit(20, 60).addChainLimit(RATE_LIMITER_GLOBAL);
export const RATE_LIMITER_UPLOAD = new ApiWithRateLimit(20, 60).addChainLimit(RATE_LIMITER_GLOBAL);
