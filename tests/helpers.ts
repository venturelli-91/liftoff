type Runnable = { run(key: string, input: never): Promise<string> };

/** Tracks the highest number of simultaneous in-flight calls across mocks. */
export function probe(
  mocks: Runnable[],
  shared: { inFlight: number; peak: number },
) {
  for (const m of mocks) {
    const run = m.run;
    m.run = async (k, i) => {
      shared.peak = Math.max(shared.peak, ++shared.inFlight);
      try {
        return await run(k, i);
      } finally {
        shared.inFlight--;
      }
    };
  }
}

/** Performs the side effect, then fails the first N calls (a lost response). */
export function lostResponse(m: Runnable, times: number) {
  const run = m.run;
  let n = 0;
  m.run = async (k, i) => {
    const r = await run(k, i);
    if (++n <= times) throw new Error("mock failure after effect");
    return r;
  };
}
