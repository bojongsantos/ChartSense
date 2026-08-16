/** Execute an async mapper with bounded concurrency while preserving order. */
export async function mapConcurrent<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency = 8,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function run(): Promise<void> {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, run);
  await Promise.all(workers);
  return results;
}
