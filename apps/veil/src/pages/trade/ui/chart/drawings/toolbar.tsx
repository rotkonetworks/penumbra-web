import cn from 'clsx';
import { Minus, MousePointer2, Slash, Square, Trash2, Type } from 'lucide-react';
import type { ToolMode } from './types';

interface ToolbarProps {
  tool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  onClearAll: () => void;
  hasDrawings: boolean;
}

interface ToolButtonProps {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}

const ToolButton = ({ active, title, onClick, children }: ToolButtonProps) => (
  <button
    type='button'
    title={title}
    // stopPropagation so the chart container's click handler doesn't see
    // this and try to place a drawing at the toolbar button position.
    onClick={e => {
      e.stopPropagation();
      onClick();
    }}
    className={cn(
      'flex h-7 w-7 items-center justify-center rounded-sm transition-colors',
      'hover:bg-action-hover-overlay hover:text-text-primary',
      active ? 'bg-action-active-overlay text-text-primary' : 'text-text-secondary',
    )}
  >
    {children}
  </button>
);

export const DrawingToolbar = ({ tool, onToolChange, onClearAll, hasDrawings }: ToolbarProps) => {
  return (
    <div className='absolute left-2 top-2 z-20 flex flex-col gap-1 rounded border border-other-tonal-stroke bg-base-black/80 p-1 backdrop-blur'>
      <ToolButton
        title='Cursor (no drawing)'
        active={tool === 'none'}
        onClick={() => onToolChange('none')}
      >
        <MousePointer2 size={14} />
      </ToolButton>
      <ToolButton
        title='Horizontal price line — click on chart to place'
        active={tool === 'horizontal-line'}
        onClick={() => onToolChange(tool === 'horizontal-line' ? 'none' : 'horizontal-line')}
      >
        <Minus size={14} />
      </ToolButton>
      <ToolButton
        title='Trend line — click two points on the chart'
        active={tool === 'trend-line'}
        onClick={() => onToolChange(tool === 'trend-line' ? 'none' : 'trend-line')}
      >
        <Slash size={14} />
      </ToolButton>
      <ToolButton
        title='Rectangle — click two opposing corners'
        active={tool === 'rectangle'}
        onClick={() => onToolChange(tool === 'rectangle' ? 'none' : 'rectangle')}
      >
        <Square size={14} />
      </ToolButton>
      <ToolButton
        title='Text annotation — click to anchor, type, then Enter'
        active={tool === 'text'}
        onClick={() => onToolChange(tool === 'text' ? 'none' : 'text')}
      >
        <Type size={14} />
      </ToolButton>
      {hasDrawings && (
        <ToolButton title='Clear all drawings on this pair' active={false} onClick={onClearAll}>
          <Trash2 size={14} />
        </ToolButton>
      )}
    </div>
  );
};
