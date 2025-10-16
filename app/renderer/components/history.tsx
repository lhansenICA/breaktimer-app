import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  HistoryEvent,
  HistoryEventType,
  HistoryFilter,
  HistoryTimeRange,
} from "../../types/history";
import { Settings } from "../../types/settings";

interface TimelineSegment {
  start: number;
  end: number;
  type: "break" | "work" | "outside" | "offline";
  event?: HistoryEvent;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export default function History() {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [timeRange, setTimeRange] = useState<HistoryTimeRange>(
    HistoryTimeRange.Days7,
  );
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const loadSettings = async () => {
    const settings = (await ipcRenderer.invokeGetSettings()) as Settings;
    setSettings(settings);
  };

  const loadHistory = useCallback(async () => {
    const filter: HistoryFilter = { range: timeRange };

    if (timeRange === HistoryTimeRange.Custom && customStart && customEnd) {
      filter.startTime = new Date(customStart).getTime();
      filter.endTime = new Date(customEnd).getTime();
    }

    const events = await ipcRenderer.invoke("HISTORY_GET", filter) as HistoryEvent[];
    setHistory(events);
  }, [timeRange, customStart, customEnd]);

  useEffect(() => {
    loadSettings();
    loadHistory();
  }, [loadHistory]);

  const formatEventType = (type: HistoryEventType): string => {
    switch (type) {
      case HistoryEventType.BreakStart:
        return "Break Started";
      case HistoryEventType.BreakEnd:
        return "Break Ended";
      case HistoryEventType.BreakSkip:
        return "Break Skipped";
      case HistoryEventType.BreakPostpone:
        return "Break Snoozed";
      case HistoryEventType.AppStart:
        return "App Started";
      case HistoryEventType.AppStop:
        return "App Stopped";
      case HistoryEventType.IdleReset:
        return "Idle Reset";
      default:
        return type;
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const generateTimeline = (): TimelineSegment[] => {
    if (!history.length || !settings) return [];

    const now = Date.now();
    let startTime: number;
    let endTime: number;

    switch (timeRange) {
      case HistoryTimeRange.Hours24:
        startTime = now - 24 * 60 * 60 * 1000;
        endTime = now;
        break;
      case HistoryTimeRange.Days3:
        startTime = now - 3 * 24 * 60 * 60 * 1000;
        endTime = now;
        break;
      case HistoryTimeRange.Days7:
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        endTime = now;
        break;
      case HistoryTimeRange.Days14:
        startTime = now - 14 * 24 * 60 * 60 * 1000;
        endTime = now;
        break;
      case HistoryTimeRange.Days30:
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        endTime = now;
        break;
      case HistoryTimeRange.Custom:
        startTime = customStart
          ? new Date(customStart).getTime()
          : now - 7 * 24 * 60 * 60 * 1000;
        endTime = customEnd ? new Date(customEnd).getTime() : now;
        break;
      default:
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        endTime = now;
    }

    const segments: TimelineSegment[] = [];
    const sortedEvents = [...history].sort((a, b) => a.timestamp - b.timestamp);

    let currentTime = startTime;
    let appRunning = true; // Assume app is running since we have events
    let inBreak = false;

    // Find first app start event to determine initial state
    const firstAppStart = sortedEvents.find(
      (e) => e.type === HistoryEventType.AppStart,
    );
    if (firstAppStart && firstAppStart.timestamp > startTime) {
      appRunning = false; // App wasn't running at start of timeline
    }

    for (const event of sortedEvents) {
      if (event.timestamp < startTime || event.timestamp > endTime) continue;

      // Add segment before this event
      if (currentTime < event.timestamp) {
        let segmentType: "break" | "work" | "outside" | "offline" = "offline";
        if (inBreak) segmentType = "break";
        else if (appRunning) segmentType = "work";

        segments.push({
          start: currentTime,
          end: event.timestamp,
          type: segmentType,
        });
      }

      // Handle the event
      if (event.type === HistoryEventType.AppStart) {
        appRunning = true;
      } else if (event.type === HistoryEventType.AppStop) {
        appRunning = false;
        inBreak = false;
      } else if (event.type === HistoryEventType.BreakStart) {
        inBreak = true;
      } else if (event.type === HistoryEventType.BreakEnd) {
        inBreak = false;
      } else if (
        event.type === HistoryEventType.BreakPostpone ||
        event.type === HistoryEventType.BreakSkip
      ) {
        inBreak = false;
      }

      currentTime = event.timestamp;
    }

    // Add final segment
    if (currentTime < endTime) {
      let segmentType: "break" | "work" | "outside" | "offline" = appRunning
        ? "work"
        : "offline";
      if (inBreak) segmentType = "break";

      segments.push({
        start: currentTime,
        end: endTime,
        type: segmentType,
      });
    }

    return segments;
  };

  const timeline = generateTimeline();
  const totalDuration =
    timeline.length > 0
      ? timeline[timeline.length - 1].end - timeline[0].start
      : 0;

  if (!settings?.historyEnabled) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">History Disabled</h2>
          <p className="text-muted-foreground">
            Enable history tracking in Settings to view your break history.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      <div className="border-b border-border bg-background p-4">
        <h1 className="text-2xl font-bold mb-4">Break History</h1>

        <div className="flex items-center gap-4">
          <Select
            value={timeRange}
            onValueChange={(value) => setTimeRange(value as HistoryTimeRange)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={HistoryTimeRange.Hours24}>24 hours</SelectItem>
              <SelectItem value={HistoryTimeRange.Days3}>3 days</SelectItem>
              <SelectItem value={HistoryTimeRange.Days7}>7 days</SelectItem>
              <SelectItem value={HistoryTimeRange.Days14}>14 days</SelectItem>
              <SelectItem value={HistoryTimeRange.Days30}>30 days</SelectItem>
              <SelectItem value={HistoryTimeRange.Custom}>Custom</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={loadHistory}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => ipcRenderer.invoke("HISTORY_TEST")}
          >
            Test Event
          </Button>

          {timeRange === HistoryTimeRange.Custom && (
            <>
              <input
                type="datetime-local"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-2 border border-border rounded-md"
              />
              <span>to</span>
              <input
                type="datetime-local"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 border border-border rounded-md"
              />
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {timeline.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Timeline</h3>
            <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
              {timeline.map((segment, index) => {
                const width =
                  ((segment.end - segment.start) / totalDuration) * 100;
                const left =
                  ((segment.start - timeline[0].start) / totalDuration) * 100;

                let color = "#e5e7eb"; // gray for offline
                if (segment.type === "break") {
                  if (segment.event?.type === HistoryEventType.BreakPostpone) {
                    // Darker shade for postponed breaks
                    const rgb = hexToRgb(settings.backgroundColor);
                    color = rgb
                      ? `rgb(${Math.max(0, rgb.r - 40)}, ${Math.max(0, rgb.g - 40)}, ${Math.max(0, rgb.b - 40)})`
                      : settings.backgroundColor;
                  } else {
                    color = settings.backgroundColor;
                  }
                } else if (segment.type === "work") {
                  color = settings.secondaryColor;
                } else if (segment.type === "outside") {
                  color = "#9ca3af";
                }

                return (
                  <div
                    key={index}
                    className="absolute h-full"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: color,
                    }}
                    title={`${segment.type} - ${new Date(segment.start).toLocaleString()} to ${new Date(segment.end).toLocaleString()}`}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-6 mt-2 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: settings.backgroundColor }}
                />
                <span>Break Time</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: settings.secondaryColor }}
                />
                <span>Work Time</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-300" />
                <span>App Offline</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Events</h3>
          {history.length === 0 ? (
            <p className="text-muted-foreground">
              No history events found for the selected time range.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {history.map((event) => {
                let eventColor = "border-border";
                if (
                  event.type === HistoryEventType.BreakStart ||
                  event.type === HistoryEventType.BreakEnd
                ) {
                  eventColor = "border-l-4";
                } else if (event.type === HistoryEventType.BreakPostpone) {
                  eventColor = "border-l-4 border-l-orange-500";
                } else if (event.type === HistoryEventType.BreakSkip) {
                  eventColor = "border-l-4 border-l-red-500";
                }

                return (
                  <div
                    key={event.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${eventColor}`}
                    style={{
                      borderLeftColor:
                        event.type === HistoryEventType.BreakStart ||
                        event.type === HistoryEventType.BreakEnd
                          ? settings?.backgroundColor
                          : undefined,
                    }}
                  >
                    <div>
                      <div className="font-medium">
                        {formatEventType(event.type)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                    </div>
                    {event.duration && (
                      <div className="text-sm font-medium">
                        {formatDuration(event.duration)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-8 text-sm text-muted-foreground">
          Data is only stored locally and saved for up to 90 days.
        </div>
      </div>
    </div>
  );
}
