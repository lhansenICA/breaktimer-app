export enum HistoryEventType {
  BreakStart = "BREAK_START",
  BreakEnd = "BREAK_END",
  BreakSkip = "BREAK_SKIP",
  BreakPostpone = "BREAK_POSTPONE",
  AppStart = "APP_START",
  AppStop = "APP_STOP",
  IdleReset = "IDLE_RESET",
}

export interface HistoryEvent {
  id: string;
  type: HistoryEventType;
  timestamp: number;
  duration?: number; // in seconds, for break events
  metadata?: Record<string, unknown>;
}

export enum HistoryTimeRange {
  Hours24 = "24_HOURS",
  Days3 = "3_DAYS",
  Days7 = "7_DAYS",
  Days14 = "14_DAYS",
  Days30 = "30_DAYS",
  Custom = "CUSTOM",
}

export interface HistoryFilter {
  range: HistoryTimeRange;
  startTime?: number;
  endTime?: number;
}
