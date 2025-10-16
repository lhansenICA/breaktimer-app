import Store from "electron-store";
import log from "electron-log";
import { v4 as uuidv4 } from "uuid";
import {
  HistoryEvent,
  HistoryEventType,
  HistoryFilter,
} from "../../types/history";
import { getSettings } from "./store";

const historyStore = new Store({
  name: "history",
  defaults: {
    events: [] as HistoryEvent[],
  },
});

const HISTORY_RETENTION_DAYS = 90;
const CLEANUP_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

export function initHistory(): void {
  log.info("initHistory called");
  const events = historyStore.get("events") as HistoryEvent[];
  log.info("Current history events count:", events.length);
  cleanupOldHistory();
  setInterval(cleanupOldHistory, CLEANUP_INTERVAL_MS);
}

export function addHistoryEvent(
  type: HistoryEventType,
  duration?: number,
  metadata?: Record<string, unknown>,
): void {
  const settings = getSettings();
  log.info(
    "addHistoryEvent called:",
    type,
    "historyEnabled:",
    settings.historyEnabled,
  );
  if (!settings.historyEnabled) {
    log.info("History disabled, not adding event");
    return;
  }

  const event: HistoryEvent = {
    id: uuidv4(),
    type,
    timestamp: Date.now(),
    duration,
    metadata,
  };

  const events = historyStore.get("events") as HistoryEvent[];
  events.push(event);
  historyStore.set("events", events);
  log.info(
    "History event added:",
    JSON.stringify(event),
    "Total events:",
    events.length,
  );
}

export function getHistory(filter?: HistoryFilter): HistoryEvent[] {
  const settings = getSettings();
  log.info("getHistory called, historyEnabled:", settings.historyEnabled);
  if (!settings.historyEnabled) return [];

  let events = [...(historyStore.get("events") as HistoryEvent[])];
  log.info("Raw events from store:", events.length);

  if (filter) {
    const now = Date.now();
    let startTime: number;
    let endTime = filter.endTime || now;

    switch (filter.range) {
      case "24_HOURS":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "3_DAYS":
        startTime = now - 3 * 24 * 60 * 60 * 1000;
        break;
      case "7_DAYS":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "14_DAYS":
        startTime = now - 14 * 24 * 60 * 60 * 1000;
        break;
      case "30_DAYS":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "CUSTOM":
        startTime = filter.startTime || 0;
        break;
      default:
        startTime = now - 7 * 24 * 60 * 60 * 1000;
    }

    events = events.filter(
      (event) => event.timestamp >= startTime && event.timestamp <= endTime,
    );
  }

  return events.sort((a, b) => b.timestamp - a.timestamp);
}

export function clearHistory(): void {
  historyStore.set("events", []);
}

function cleanupOldHistory(): void {
  const cutoffTime = Date.now() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const events = historyStore.get("events") as HistoryEvent[];
  const filteredEvents = events.filter((event) => event.timestamp > cutoffTime);
  historyStore.set("events", filteredEvents);
}
