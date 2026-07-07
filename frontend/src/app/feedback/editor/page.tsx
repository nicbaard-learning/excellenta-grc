'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Send, Undo2, Trash2,
  Pen, Square, Circle, Type, ArrowUpRight,
  Minus, Palette
} from 'lucide-react';

type Tool = 'pen' | 'arrow' | 'rectangle' | 'circle' | 'text' | 'line';

const TOOL_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#000000',
];

export default function FeedbackEditorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricModuleRef = useRef<any>(null);
  const screenshotRef = useRef<string>('');
  const [activeTool, setActiveTool] = useState<Tool>('pen');
  const [activeColor, setActiveColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(3);
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [senderName, setSenderName] = useState('');
  const [canvasReady, setCanvasReady] = useState(false);
  const isDrawing = useRef(false);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeShape = useRef<any>(null);
  const lastPenPoint = useRef<{ x: number; y: number } | null>(null);
  const pointerCleanupRef = useRef<(() => void) | null>(null);

  // Store tool settings in refs so event handlers always have latest values
  const activeToolRef = useRef(activeTool);
  const activeColorRef = useRef(activeColor);
  const lineWidthRef = useRef(lineWidth);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { activeColorRef.current = activeColor; }, [activeColor]);
  useEffect(() => { lineWidthRef.current = lineWidth; }, [lineWidth]);

  // Use an incrementing ID to handle React strict mode double-mount.
  // Each mount gets a unique ID; stale loads bail out early.
  const loadIdRef = useRef(0);

  useEffect(() => {
    const thisLoadId = ++loadIdRef.current;

    const load = async () => {
      try {
        const { idbGet } = await import('@/lib/idb');
        const screenshot = await idbGet('feedback_screenshot');
        const url = (await idbGet('feedback_page_url')) || '';
        const title = (await idbGet('feedback_page_title')) || '';

        // Bail out if a newer mount has started
        if (loadIdRef.current !== thisLoadId) return;

        if (!screenshot) {
          alert('No screenshot found. Please capture a page first.');
          window.close();
          return;
        }

        console.log('[FeedbackEditor] Screenshot loaded from IndexedDB, length:', screenshot.length);
        screenshotRef.current = screenshot;

        // Dynamic import to avoid SSR issues — import once, store in ref
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fabric: any = await import('fabric');
        const { Canvas } = fabric;
        fabricModuleRef.current = fabric;

        // Guard: dispose any previously initialized canvas on this element
        if (fabricRef.current) {
          fabricRef.current.dispose();
          fabricRef.current = null;
        }

        const canvas = new Canvas(canvasRef.current!, {
          selection: false,
          backgroundColor: 'transparent',
        });
        fabricRef.current = canvas;

        // Use Fabric's built-in event system instead of native DOM events.
        // Fabric v7 handles event propagation internally and provides
        // normalized event objects with scenePoint/viewportPoint coordinates.
        // This avoids issues with stopPropagation() that Fabric may call
        // on native DOM events, which would prevent our handlers from firing.

        const handlePointerDown = (opt: { scenePoint: { x: number; y: number }; e: PointerEvent; target?: any }) => {
          try {
            if (opt.e && opt.e.button !== 0) return;
            // Don't start drawing if user clicked on an existing object
            // (e.g. resize handle, selection). Let Fabric handle that.
            if (opt.target) return;

            const tool = activeToolRef.current;
            const pointer = opt.scenePoint;
            const fm = fabricModuleRef.current;
            if (!fm) return;

            console.log('[Editor] pointerdown', tool, pointer.x, pointer.y);

            if (tool === 'text') {
              const text = new fm.IText('Type here...', {
                left: pointer.x,
                top: pointer.y,
                fontSize: 16 + lineWidthRef.current * 2,
                fill: activeColorRef.current,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 'bold',
                selectable: true,
                evented: true,
              });
              canvas.add(text);
              canvas.setActiveObject(text);
              text.enterEditing();
              return;
            }

            isDrawing.current = true;

            if (tool === 'pen') {
              // Store the starting point. On each pointermove we'll
              // draw a small Line segment from the previous point
              // to the current point. This avoids using Fabric v7's
              // Path class which has unreliable path update behavior.
              lastPenPoint.current = { x: pointer.x, y: pointer.y };
              return;
            }

            // Non-pen, non-text tools
            startPoint.current = { x: pointer.x, y: pointer.y };

            const currentColor = activeColorRef.current;
            const currentWidth = lineWidthRef.current;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let shape: any;

            switch (tool) {
              case 'rectangle':
                shape = new fm.Rect({
                  left: pointer.x,
                  top: pointer.y,
                  width: 0,
                  height: 0,
                  fill: 'transparent',
                  stroke: currentColor,
                  strokeWidth: currentWidth,
                  selectable: false,
                  evented: false,
                });
                break;
              case 'circle':
                shape = new fm.Ellipse({
                  left: pointer.x,
                  top: pointer.y,
                  rx: 0,
                  ry: 0,
                  fill: 'transparent',
                  stroke: currentColor,
                  strokeWidth: currentWidth,
                  selectable: false,
                  evented: false,
                });
                break;
              case 'arrow':
              case 'line':
                shape = new fm.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                  stroke: currentColor,
                  strokeWidth: currentWidth,
                  selectable: false,
                  evented: false,
                });
                break;
              default:
                return;
            }

            activeShape.current = shape;
            canvas.add(shape);
          } catch (err) {
            console.error('[Editor] pointerdown error:', err);
            isDrawing.current = false;
            activeShape.current = null;
          }
        };

        const handlePointerMove = (opt: { scenePoint: { x: number; y: number } }) => {
          try {
            if (!isDrawing.current) return;

            const tool = activeToolRef.current;
            const pointer = opt.scenePoint;

            if (tool === 'pen') {
              // Draw a small Line segment from the previous point to the
              // current point. Each segment is an individual Line object,
              // which avoids Fabric v7's unreliable Path.set({path:...}).
              const prev = lastPenPoint.current;
              const fm = fabricModuleRef.current;
              if (fm && prev) {
                const line = new fm.Line([prev.x, prev.y, pointer.x, pointer.y], {
                  stroke: activeColorRef.current,
                  strokeWidth: lineWidthRef.current,
                  selectable: false,
                  evented: false,
                });
                activeShape.current = line; // Keep track so pointerup can handle it
                canvas.add(line);
              }
              lastPenPoint.current = { x: pointer.x, y: pointer.y };
              canvas.renderAll();
              return;
            }

            if (!startPoint.current || !activeShape.current) return;

            const sx = startPoint.current.x;
            const sy = startPoint.current.y;

            switch (tool) {
              case 'rectangle':
                activeShape.current.set({
                  left: Math.min(sx, pointer.x),
                  top: Math.min(sy, pointer.y),
                  width: Math.abs(pointer.x - sx),
                  height: Math.abs(pointer.y - sy),
                });
                break;
              case 'circle':
                activeShape.current.set({
                  left: Math.min(sx, pointer.x),
                  top: Math.min(sy, pointer.y),
                  rx: Math.abs(pointer.x - sx) / 2,
                  ry: Math.abs(pointer.y - sy) / 2,
                });
                break;
              case 'arrow':
              case 'line':
                activeShape.current.set({ x2: pointer.x, y2: pointer.y });
                break;
            }
            canvas.renderAll();
          } catch (err) {
            console.error('[Editor] pointermove error:', err);
            isDrawing.current = false;
            activeShape.current = null;
            lastPenPoint.current = null;
          }
        };

        const handlePointerUp = () => {
          try {
            if (!isDrawing.current) return;
            isDrawing.current = false;

            const tool = activeToolRef.current;

            if (tool === 'arrow' && activeShape.current) {
              const fm = fabricModuleRef.current;
              const currentColor = activeColorRef.current;
              const currentWidth = lineWidthRef.current;

              const line = activeShape.current;
              const x1 = line.x1 || 0;
              const y1 = line.y1 || 0;
              const x2 = line.x2 || 0;
              const y2 = line.y2 || 0;

              const angle = Math.atan2(y2 - y1, x2 - x1);
              const headLen = 15;

              if (fm) {
                const arrowHead1 = new fm.Line([
                  x2, y2,
                  x2 - headLen * Math.cos(angle - Math.PI / 6),
                  y2 - headLen * Math.sin(angle - Math.PI / 6),
                ], {
                  stroke: currentColor,
                  strokeWidth: currentWidth,
                  selectable: false,
                  evented: false,
                });

                const arrowHead2 = new fm.Line([
                  x2, y2,
                  x2 - headLen * Math.cos(angle + Math.PI / 6),
                  y2 - headLen * Math.sin(angle + Math.PI / 6),
                ], {
                  stroke: currentColor,
                  strokeWidth: currentWidth,
                  selectable: false,
                  evented: false,
                });

                canvas.add(arrowHead1, arrowHead2);
              }
            }

            if (activeShape.current) {
              // Only set selectable for non-pen shapes (pen uses individual
              // Line segments which should stay non-interactive).
              if (tool !== 'pen') {
                activeShape.current.set({ selectable: true, evented: true });
                canvas.setActiveObject(activeShape.current);
              }
            }

            activeShape.current = null;
            lastPenPoint.current = null;
            canvas.renderAll();
          } catch (err) {
            console.error('[Editor] pointerup error:', err);
            isDrawing.current = false;
            activeShape.current = null;
            lastPenPoint.current = null;
          }
        };

        // Use Fabric's event system instead of native DOM events.
        // Fabric v7 handles pointer capture internally and dispatches
        // mouse:move / mouse:up events even when the pointer leaves the canvas.
        // We get normalized scenePoint coordinates directly from the event object.
        canvas.on('mouse:down', handlePointerDown);
        canvas.on('mouse:move', handlePointerMove);
        canvas.on('mouse:up', handlePointerUp);

        pointerCleanupRef.current = () => {
          canvas.off('mouse:down', handlePointerDown);
          canvas.off('mouse:move', handlePointerMove);
          canvas.off('mouse:up', handlePointerUp);
        };

        const img = await fabric.FabricImage.fromURL(screenshot);
        if (loadIdRef.current !== thisLoadId) { canvas.dispose(); return; }

        console.log('[FeedbackEditor] Image loaded:', img.width, 'x', img.height);
        const maxWidth = window.innerWidth - 340;
        const maxHeight = window.innerHeight - 40;
        const scale = Math.min(maxWidth / img.width!, maxHeight / img.height!, 1);

        canvas.setDimensions({
          width: img.width! * scale,
          height: img.height! * scale,
        });

        // Set proper position so the image fills the canvas (not centered at 0,0)
        img.set({
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          scaleX: scale,
          scaleY: scale,
        });
        canvas.backgroundImage = img;
        canvas.renderAll();
        setPageUrl(url);
        setPageTitle(title);
        setCanvasReady(true);
      } catch (err) {
        console.error('[FeedbackEditor] Failed to load screenshot:', err);
        alert('Failed to load screenshot. Please try capturing again.');
      }
    };

    load();

    return () => {
      // Invalidate any in-flight load from this mount
      loadIdRef.current++;
      pointerCleanupRef.current?.();
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, []);

  // Tool setup: configure canvas cursor and ensure Fabric's isDrawingMode is off
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // All drawing is handled via Fabric's event system (canvas.on()).
    // We keep isDrawingMode off and use refs (activeToolRef, etc.)
    // in the handlers for latest state, so the effect only needs to
    // configure cursor and selection.
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.defaultCursor = 'crosshair';
    canvas.hoverCursor = 'crosshair';
  }, [canvasReady]);

  const handleUndo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects();
    if (objects.length > 0) {
      canvas.remove(objects[objects.length - 1]);
      canvas.renderAll();
    }
  }, []);

  const handleClear = useCallback(() => {
    const canvas = fabricRef.current;
    const fm = fabricModuleRef.current;
    const screenshot = screenshotRef.current;
    if (!canvas || !fm || !screenshot) return;
    canvas.clear();
    fm.FabricImage.fromURL(screenshot).then((img: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const maxWidth = window.innerWidth - 340;
      const maxHeight = window.innerHeight - 40;
      const scale = Math.min(maxWidth / img.width!, maxHeight / img.height!, 1);
      canvas.setDimensions({
        width: img.width! * scale,
        height: img.height! * scale,
      });
      img.set({
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        scaleX: scale,
        scaleY: scale,
      });
      canvas.backgroundImage = img;
      canvas.renderAll();
    });
  }, []);

  const handleSend = async () => {
    if (!senderName.trim()) {
      alert('Please enter your name.');
      return;
    }

    setSending(true);
    try {
      const canvas = fabricRef.current;
      if (!canvas) throw new Error('Canvas not initialized');

      const annotatedImage = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1,
      });

      const response = await fetch(annotatedImage);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('image', blob, 'feedback.png');
      formData.append('page_url', pageUrl);
      formData.append('page_title', pageTitle);
      formData.append('notes', notes);
      formData.append('sender_name', senderName);

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const result = await fetch(`${apiBase}/feedback`, {
        method: 'POST',
        body: formData,
      });

      if (!result.ok) {
        const err = await result.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(err.detail || 'Failed to send feedback');
      }

      setSent(true);
      const { idbRemove } = await import('@/lib/idb');
      await idbRemove('feedback_screenshot');
      await idbRemove('feedback_page_url');
      await idbRemove('feedback_page_title');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Send failed:', error);
      alert(`Failed to send: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-8 text-center max-w-md"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mx-auto">
            <svg className="h-8 w-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Feedback Sent!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your annotated screenshot and notes have been sent to the development team via Discord.
          </p>
          <button
            onClick={() => window.close()}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Close Tab
          </button>
        </motion.div>
      </div>
    );
  }

  const tools: { id: Tool; icon: typeof Pen; label: string }[] = [
    { id: 'pen', icon: Pen, label: 'Draw' },
    { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
    { id: 'line', icon: Minus, label: 'Line' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'text', icon: Type, label: 'Text' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left sidebar - Tools */}
      <div className="flex w-80 flex-col border-r border-border bg-card">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border p-4">
          <button
            onClick={() => window.close()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Feedback Editor</h1>
            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
              {pageTitle || 'Annotate screenshot'}
            </p>
          </div>
        </div>

        {/* Drawing Tools */}
        <div className="p-4 border-b border-border">
          <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Tools</label>
          <div className="grid grid-cols-3 gap-1.5">
            {tools.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTool(id)}
                className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs transition-colors ${
                  activeTool === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Color Picker */}
        <div className="p-4 border-b border-border">
          <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Palette className="mr-1 inline h-3 w-3" /> Color
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TOOL_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setActiveColor(color)}
                className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                  activeColor === color ? 'border-foreground scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Line Width */}
        <div className="p-4 border-b border-border">
          <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Stroke Width: {lineWidth}px
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        {/* Actions */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-2">
            <button
              onClick={handleUndo}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </button>
            <button
              onClick={handleClear}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        </div>

        {/* Sender Name */}
        <div className="p-4 border-b border-border">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Name</label>
          <input
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="e.g. John Smith"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
          />
        </div>

        {/* Notes */}
        <div className="flex-1 p-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe the changes or issues you'd like addressed..."
            className="h-full min-h-[120px] w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
          />
        </div>

        {/* Send Button */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleSend}
            disabled={sending || !senderName.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send to Discord
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Page: {pageUrl ? (() => { try { return new URL(pageUrl).pathname; } catch { return pageUrl; } })() : 'Unknown'}
          </p>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 overflow-auto flex items-center justify-center bg-muted/20 p-6">
        <div className="relative rounded-lg shadow-2xl">
          <canvas ref={canvasRef} />
        </div>
        {!canvasReady && (
          <div className="absolute flex flex-col items-center gap-4 text-muted-foreground">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm">Loading screenshot...</p>
          </div>
        )}
      </div>
    </div>
  );
}
