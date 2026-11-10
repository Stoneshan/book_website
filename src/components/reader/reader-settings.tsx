"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import {
  DEFAULT_SETTINGS,
  type ReaderSettings,
  type ReaderTheme,
} from "@/lib/reader/storage";
import { cn } from "@/lib/utils";

interface ReaderSettingsPanelProps {
  settings: ReaderSettings;
  onChange: (next: ReaderSettings) => void;
}

const themes: Array<{ value: ReaderTheme; label: string; bg: string; fg: string }> = [
  { value: "light", label: "白色", bg: "#ffffff", fg: "#1f2329" },
  { value: "sepia", label: "米黄", bg: "#f6efdf", fg: "#3b3326" },
  { value: "dark", label: "夜间", bg: "#17181a", fg: "#c9cdd4" },
];

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-4">
      <div className="mb-2.5 flex items-center justify-between text-xs">
        <span style={{ color: "var(--reader-muted)" }}>{label}</span>
        {value ? <span className="tabular-nums opacity-80">{value}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function ReaderSettingsPanel({ settings, onChange }: ReaderSettingsPanelProps) {
  function patch(next: Partial<ReaderSettings>) {
    onChange({ ...settings, ...next });
  }

  return (
    <div className="divide-y" style={{ borderColor: "var(--reader-line)" }}>
      <Row label="阅读主题">
        <div className="grid grid-cols-3 gap-2">
          {themes.map((theme) => (
            <button
              key={theme.value}
              type="button"
              onClick={() => patch({ theme: theme.value })}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-xs transition-all",
                settings.theme === theme.value ? "" : "opacity-85 hover:opacity-100",
              )}
              style={{
                borderColor:
                  settings.theme === theme.value ? "var(--reader-accent)" : "var(--reader-line)",
                backgroundColor: theme.bg,
                color: theme.fg,
                boxShadow:
                  settings.theme === theme.value
                    ? "0 0 0 4px color-mix(in srgb, var(--reader-accent) 16%, transparent)"
                    : "0 1px 2px rgba(16,24,40,0.04)",
              }}
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-full border font-serif-cn text-[11px]"
                style={{ borderColor: theme.fg, color: theme.fg }}
              >
                文
              </span>
              {theme.label}
            </button>
          ))}
        </div>
      </Row>

      <Row label="字号" value={`${settings.fontSize}px`}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="减小字号"
            onClick={() => patch({ fontSize: Math.max(16, settings.fontSize - 1) })}
            className="grid h-8 w-8 place-items-center rounded-full border transition-colors reader-hover"
            style={{ borderColor: "var(--reader-line)" }}
          >
            <Minus className="h-3.5 w-3.5" aria-hidden />
          </button>
          <input
            type="range"
            min={16}
            max={30}
            step={1}
            value={settings.fontSize}
            onChange={(event) => patch({ fontSize: Number(event.target.value) })}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full"
            style={{ accentColor: "var(--reader-accent)", backgroundColor: "var(--reader-line)" }}
            aria-label="字号"
          />
          <button
            type="button"
            aria-label="增大字号"
            onClick={() => patch({ fontSize: Math.min(30, settings.fontSize + 1) })}
            className="grid h-8 w-8 place-items-center rounded-full border transition-colors reader-hover"
            style={{ borderColor: "var(--reader-line)" }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </Row>

      <Row label="行距" value={settings.lineHeight.toFixed(2)}>
        <input
          type="range"
          min={1.5}
          max={2.2}
          step={0.05}
          value={settings.lineHeight}
          onChange={(event) => patch({ lineHeight: Number(event.target.value) })}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
          style={{ accentColor: "var(--reader-accent)", backgroundColor: "var(--reader-line)" }}
          aria-label="行距"
        />
      </Row>

      <Row label="版心宽度" value={`${settings.width}rem`}>
        <input
          type="range"
          min={32}
          max={54}
          step={1}
          value={settings.width}
          onChange={(event) => patch({ width: Number(event.target.value) })}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
          style={{ accentColor: "var(--reader-accent)", backgroundColor: "var(--reader-line)" }}
          aria-label="版心宽度"
        />
      </Row>

      <Row label="字体">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { value: "serif", label: "宋体", className: "font-serif-cn" },
              { value: "sans", label: "黑体", className: "" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => patch({ font: option.value })}
              className={cn(
                "rounded-lg border py-2 text-xs transition-colors",
                option.className,
              )}
              style={{
                borderColor:
                  settings.font === option.value ? "var(--reader-accent)" : "var(--reader-line)",
                boxShadow:
                  settings.font === option.value ? "0 0 0 1px var(--reader-accent)" : undefined,
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Row>

      <div className="pt-4">
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_SETTINGS, theme: settings.theme })}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors hover:opacity-80"
          style={{ borderColor: "var(--reader-line)", color: "var(--reader-muted)" }}
        >
          <RotateCcw className="h-3 w-3" aria-hidden />
          恢复默认排版
        </button>
      </div>
    </div>
  );
}
