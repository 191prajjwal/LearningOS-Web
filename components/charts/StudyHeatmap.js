"use client";
import { useMemo } from "react";
import { format, subDays, startOfWeek, eachDayOfInterval, parseISO } from "date-fns";
import { cn } from "../../lib/utils";

const WEEKS = 18;

export default function StudyHeatmap({ data = [] }) {
  const today = new Date();

  // Build date → minutes map
  const dateMap = useMemo(() => {
    const map = {};
    for (const row of data) {
      map[row.date] = row.minutes || 0;
    }
    return map;
  }, [data]);

  // Build grid: 18 weeks × 7 days
  const startDay = startOfWeek(subDays(today, WEEKS * 7), { weekStartsOn: 0 });
  const allDays = eachDayOfInterval({ start: startDay, end: today });

  // Group into weeks
  const weeks = [];
  let currentWeek = [];
  for (const day of allDays) {
    if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
    currentWeek.push(day);
  }
  if (currentWeek.length) weeks.push(currentWeek);

  const getLevel = (minutes) => {
    if (!minutes) return 0;
    if (minutes < 30) return 1;
    if (minutes < 60) return 2;
    if (minutes < 120) return 3;
    return 4;
  };

  const LEVEL_COLORS = [
    "bg-white/[0.04]",
    "bg-indigo-500/25",
    "bg-indigo-500/45",
    "bg-indigo-500/70",
    "bg-indigo-500",
  ];

  const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

  const totalMinutes = Object.values(dateMap).reduce((s, m) => s + m, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const activeDays = Object.values(dateMap).filter(m => m > 0).length;

  return (
    <div className="space-y-3">
      {/* Grid */}
      <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1 flex-shrink-0">
          <div className="h-3" />
          {DAYS.map((d, i) => (
            <div key={i} className="h-3.5 text-[10px] text-muted leading-none flex items-center">{i % 2 === 0 ? d : ""}</div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1 flex-shrink-0">
            {/* Month label */}
            <div className="h-3 text-[10px] text-muted leading-none">
              {week[0] && format(week[0], "d") === "1" ? format(week[0], "MMM") : ""}
            </div>
            {/* Days */}
            {[...Array(7)].map((_, di) => {
              const day = week[di];
              if (!day) return <div key={di} className="w-3.5 h-3.5" />;

              const dateStr = format(day, "yyyy-MM-dd");
              const minutes = dateMap[dateStr] || 0;
              const level = getLevel(minutes);
              const isFuture = day > today;
              const isToday = dateStr === format(today, "yyyy-MM-dd");

              return (
                <div
                  key={di}
                  title={`${format(day, "MMM d")} — ${minutes ? Math.round(minutes) + " min" : "No study"}`}
                  className={cn(
                    "w-3.5 h-3.5 rounded-sm transition-all cursor-default",
                    isFuture ? "opacity-0" : LEVEL_COLORS[level],
                    isToday && "ring-1 ring-indigo-400 ring-offset-1 ring-offset-[rgb(14,14,20)]"
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend & Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span>Less</span>
          {LEVEL_COLORS.map((c, i) => (
            <div key={i} className={cn("w-3 h-3 rounded-sm", c)} />
          ))}
          <span>More</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted">
          <span><span className="text-primary font-mono">{totalHours}h</span> studied</span>
          <span><span className="text-primary font-mono">{activeDays}</span> active days</span>
        </div>
      </div>
    </div>
  );
}
