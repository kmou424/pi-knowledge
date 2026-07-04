import { existsSync, readdirSync, statSync, watch } from "node:fs";
import { join } from "node:path";
const watchers = new Map();
const pollers = new Map();
const snapshots = new Map();
const debounceTimers = new Map();
const DEBOUNCE_MS = 2000;
const POLL_MS = 2000;
function scheduleUpdate(kbId, onUpdate) {
    const existing = debounceTimers.get(kbId);
    if (existing)
        clearTimeout(existing);
    debounceTimers.set(kbId, setTimeout(() => {
        debounceTimers.delete(kbId);
        onUpdate(kbId);
    }, DEBOUNCE_MS));
}
function scanSnapshot(dirPath) {
    const snapshot = new Map();
    function scan(dir) {
        let entries;
        try {
            entries = readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            try {
                const stat = statSync(fullPath);
                if (entry.isDirectory()) {
                    scan(fullPath);
                }
                else if (entry.isFile()) {
                    snapshot.set(fullPath, `${stat.mtimeMs}:${stat.size}`);
                }
            }
            catch {
                /* file disappeared or is unreadable */
            }
        }
    }
    if (existsSync(dirPath))
        scan(dirPath);
    return snapshot;
}
function snapshotsDiffer(a, b) {
    if (a.size !== b.size)
        return true;
    for (const [path, value] of a) {
        if (b.get(path) !== value)
            return true;
    }
    return false;
}
function startPoller(kbId, dirPath, onUpdate) {
    snapshots.set(kbId, scanSnapshot(dirPath));
    pollers.set(kbId, setInterval(() => {
        const previous = snapshots.get(kbId) ?? new Map();
        const next = scanSnapshot(dirPath);
        if (snapshotsDiffer(previous, next)) {
            snapshots.set(kbId, next);
            scheduleUpdate(kbId, onUpdate);
        }
    }, POLL_MS));
}
export function startWatcher(kbId, dirPath, onUpdate) {
    stopWatcher(kbId);
    startPoller(kbId, dirPath, onUpdate);
    try {
        const watcher = watch(dirPath, { recursive: true }, () => {
            snapshots.set(kbId, scanSnapshot(dirPath));
            scheduleUpdate(kbId, onUpdate);
        });
        watcher.on("error", () => {
            watchers.get(kbId)?.close();
            watchers.delete(kbId);
        });
        watchers.set(kbId, watcher);
    }
    catch {
        /* polling fallback remains active */
    }
}
export function stopWatcher(kbId) {
    watchers.get(kbId)?.close();
    watchers.delete(kbId);
    const poller = pollers.get(kbId);
    if (poller) {
        clearInterval(poller);
        pollers.delete(kbId);
    }
    snapshots.delete(kbId);
    const t = debounceTimers.get(kbId);
    if (t) {
        clearTimeout(t);
        debounceTimers.delete(kbId);
    }
}
export function stopAllWatchers() {
    const ids = new Set([...watchers.keys(), ...pollers.keys()]);
    for (const id of ids)
        stopWatcher(id);
}
export function getActiveWatcherCount() {
    return new Set([...watchers.keys(), ...pollers.keys()]).size;
}
