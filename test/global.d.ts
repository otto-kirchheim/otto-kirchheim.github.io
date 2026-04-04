import type { vi as bunVi } from 'bun:test';

type BunVi = typeof bunVi;

declare module 'bun:test' {
	export const vi: BunVi & {
		hoisted<T>(factory: () => T): T;
		advanceTimersByTimeAsync(ms: number): Promise<void>;
		setSystemTime(now?: number | Date | string): void;
	};
}

export {};
