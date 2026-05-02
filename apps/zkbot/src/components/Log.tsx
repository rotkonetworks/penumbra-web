import { For } from 'solid-js';

export interface LogEntry {
  time: string;
  type: 'info' | 'ok' | 'err' | 'warn';
  msg: string;
}

interface Props {
  entries: LogEntry[];
}

export function Log(props: Props) {
  const typeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'ok': return 'text-accent';
      case 'err': return 'text-err';
      case 'warn': return 'text-warn';
      default: return 'text-info';
    }
  };

  return (
    <div class="bg-input border border-border p-3 max-h-48 overflow-y-auto">
      <div class="text-cyan text-11px mb-2">// log</div>
      <For each={props.entries}>
        {entry => (
          <div class="text-11px font-mono leading-relaxed">
            <span class="text-dim">[{entry.time}]</span>
            <span class={`mx-2 ${typeColor(entry.type)}`}>[{entry.type}]</span>
            <span class="text-text">{entry.msg}</span>
          </div>
        )}
      </For>
    </div>
  );
}
