import cn from 'clsx';
import { Minus, MousePointer2, Slash, Square, Trash2, Type, Undo2, Redo2 } from 'lucide-react';
import type { ToolMode } from './types';

interface ToolbarProps {
  tool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  onClearAll: () => void;
  hasDrawings: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
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

export const DrawingToolbar = ({
  tool,
  onToolChange,
  onClearAll,
  hasDrawings,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ToolbarProps) => {
  return (
    // Mounted in a dedicated narrow column to the left of the chart
    // canvas (see chart.tsx). Previously rendered absolute-positioned
    // *over* the chart at top-left, which fought the hover-tooltip
    // for the same corner. Own-lane layout keeps the chart canvas
    // clean and avoids the z-index dance.
    <div className='flex h-full flex-col gap-1 border-r border-r-other-solid-stroke bg-base-black/40 p-1'>
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
      <div className='my-1 h-px bg-other-tonal-stroke' />
      <ToolButton
        title={canUndo ? 'Undo (Ctrl/Cmd-Z)' : 'Nothing to undo'}
        active={false}
        onClick={canUndo ? onUndo : () => {}}
      >
        <Undo2 size={14} className={canUndo ? '' : 'opacity-40'} />
      </ToolButton>
      <ToolButton
        title={canRedo ? 'Redo (Ctrl/Cmd-Shift-Z)' : 'Nothing to redo'}
        active={false}
        onClick={canRedo ? onRedo : () => {}}
      >
        <Redo2 size={14} className={canRedo ? '' : 'opacity-40'} />
      </ToolButton>
      {hasDrawings && (
        <ToolButton title='Clear all drawings on this pair' active={false} onClick={onClearAll}>
          <Trash2 size={14} />
        </ToolButton>
      )}
    </div>
  );
};
