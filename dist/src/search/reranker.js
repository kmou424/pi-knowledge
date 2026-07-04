import { rerankInModelWorker } from "../model-worker-client.js";
let disposeTimer = null;
let disposePromise = null;
let activeRuns = 0;
let disposeRequested = false;
const idleWaiters = [];
const IDLE_MS = 30_000;
const ENABLE_NATIVE_IDLE_DISPOSE = process.env.PI_KNOWLEDGE_ENABLE_NATIVE_IDLE_DISPOSE === "true";
function clearTimer() {
    if (disposeTimer)
        clearTimeout(disposeTimer);
    disposeTimer = null;
}
function scheduleDispose() {
    if (activeRuns > 0 || disposeRequested)
        return;
    clearTimer();
    if (!ENABLE_NATIVE_IDLE_DISPOSE)
        return;
    disposeTimer = setTimeout(() => disposeReranker(), IDLE_MS);
}
function beginRun() {
    activeRuns++;
    clearTimer();
}
function endRun() {
    activeRuns--;
    if (activeRuns > 0)
        return;
    for (const resolve of idleWaiters.splice(0))
        resolve();
    if (!disposeRequested)
        scheduleDispose();
}
function waitForNoActiveRuns() {
    if (activeRuns === 0)
        return Promise.resolve();
    return new Promise((resolve) => idleWaiters.push(resolve));
}
export async function disposeReranker() {
    clearTimer();
    if (disposePromise)
        return disposePromise;
    disposeRequested = true;
    await waitForNoActiveRuns();
    disposePromise = Promise.resolve().finally(() => {
        disposePromise = null;
        disposeRequested = false;
    });
    return disposePromise;
}
export async function prepareRerankerForShutdown() {
    clearTimer();
    await waitForNoActiveRuns();
}
export async function rerank(query, candidates, topK) {
    if (candidates.length === 0)
        return [];
    beginRun();
    try {
        return await rerankInModelWorker(query, candidates, topK);
    }
    finally {
        endRun();
    }
}
