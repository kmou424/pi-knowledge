import { fork } from "node:child_process";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
let worker = null;
let nextRequestId = 1;
const pending = new Map();
const WORKER_STDERR_TAIL_CHARS = 4_000;
function rejectPending(error) {
    for (const request of pending.values()) {
        request.reject(error);
    }
    pending.clear();
}
function getWorkerPath() {
    const workerFile = fileURLToPath(import.meta.url).endsWith(".js") ? "model-worker.js" : "model-worker.ts";
    return fileURLToPath(new URL(`./${workerFile}`, import.meta.url));
}
function getWorkerExecArgv() {
    return fileURLToPath(import.meta.url).endsWith(".js") ? [] : ["--experimental-strip-types"];
}
function getNodeExecPath() {
    const configured = process.env.PI_KNOWLEDGE_NODE_PATH?.trim();
    if (configured)
        return configured;
    const execName = basename(process.execPath).toLowerCase();
    return execName === "node" || execName === "node.exe" ? process.execPath : "node";
}
function appendWorkerStderr(current, chunk) {
    const next = `${current}${chunk.toString("utf-8")}`;
    return next.length > WORKER_STDERR_TAIL_CHARS ? next.slice(-WORKER_STDERR_TAIL_CHARS) : next;
}
function formatWorkerExitError(code, signal, stderrTail) {
    const reason = `Model worker exited before responding (code ${code ?? "null"}, signal ${signal ?? "null"})`;
    const stderr = stderrTail.trim();
    if (!stderr)
        return new Error(`${reason}. Set PI_KNOWLEDGE_NODE_PATH to a working Node binary if Pi is not running under Node.`);
    return new Error(`${reason}. Worker stderr:\n${stderr}`);
}
function getWorker() {
    if (worker?.connected)
        return worker;
    const workerPath = getWorkerPath();
    worker = fork(workerPath, {
        execPath: getNodeExecPath(),
        execArgv: getWorkerExecArgv(),
        stdio: ["ignore", "ignore", "pipe", "ipc"],
        env: process.env,
    });
    const child = worker;
    let stderrTail = "";
    child.stderr?.on("data", (chunk) => {
        stderrTail = appendWorkerStderr(stderrTail, chunk);
    });
    worker.on("message", (message) => {
        const request = pending.get(message.id);
        if (!request)
            return;
        pending.delete(message.id);
        if (message.error) {
            request.reject(new Error(message.error));
        }
        else {
            request.resolve(message.result);
        }
    });
    worker.on("exit", (code, signal) => {
        if (worker !== child)
            return;
        worker = null;
        if (pending.size > 0) {
            rejectPending(formatWorkerExitError(code, signal, stderrTail));
        }
    });
    worker.on("error", (error) => {
        if (worker !== child)
            return;
        worker = null;
        rejectPending(error);
    });
    return worker;
}
async function requestModelWorker(message, signal) {
    if (signal?.aborted)
        throw new Error("Cancelled");
    const child = getWorker();
    const id = nextRequestId++;
    return new Promise((resolve, reject) => {
        let abortHandler;
        pending.set(id, { resolve, reject });
        if (signal) {
            abortHandler = () => {
                pending.delete(id);
                reject(new Error("Cancelled"));
                shutdownModelWorker();
            };
            signal.addEventListener("abort", abortHandler, { once: true });
        }
        const cleanup = () => {
            if (abortHandler)
                signal?.removeEventListener("abort", abortHandler);
        };
        const originalResolve = resolve;
        const originalReject = reject;
        pending.set(id, {
            resolve(value) {
                cleanup();
                originalResolve(value);
            },
            reject(error) {
                cleanup();
                originalReject(error);
            },
        });
        child.send({ id, ...message }, (error) => {
            if (!error)
                return;
            pending.delete(id);
            cleanup();
            reject(error);
        });
    });
}
export async function embedInModelWorker(texts, prefix, signal) {
    const result = await requestModelWorker({ type: "embed", texts, prefix }, signal);
    if (!Array.isArray(result))
        throw new Error("Invalid embedding worker response");
    return result.map((vector) => {
        if (!Array.isArray(vector))
            throw new Error("Invalid embedding vector from worker");
        return new Float32Array(vector);
    });
}
export async function rerankInModelWorker(query, candidates, topK) {
    const result = await requestModelWorker({ type: "rerank", query, candidates, topK });
    if (!Array.isArray(result))
        throw new Error("Invalid reranker worker response");
    return result.map((item) => {
        if (typeof item !== "object" ||
            item === null ||
            typeof item.chunkId !== "string" ||
            typeof item.score !== "number") {
            throw new Error("Invalid reranker result from worker");
        }
        return item;
    });
}
export function shutdownModelWorker() {
    const child = worker;
    worker = null;
    rejectPending(new Error("Model worker shut down"));
    if (child && !child.killed) {
        child.kill("SIGKILL");
    }
}
