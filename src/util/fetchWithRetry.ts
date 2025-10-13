import { Logger } from '@nestjs/common';

const logger = new Logger("FetchWithRetry");

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
): Promise<Response> {
  const TIMEOUT_MS = 3_000;

  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status >= 500 && response.status < 600) {
        if (attempt > maxRetries)
          throw new Error(`5xx response after ${maxRetries} retries`);
        continue; // retry on server error
      }

      return response;
    } catch (error: any) {
      this.logger.warn("Retrying request", error);
      // Handle timeout or fetch errors (e.g., AbortError, network issues)
      if (attempt > maxRetries)
        throw new Error(
          `Fetch failed after ${maxRetries} retries: ${error.message}`,
        );
    }
  }

  throw new Error(`Unreachable code`);
}
