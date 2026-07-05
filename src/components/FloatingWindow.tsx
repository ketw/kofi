import React, { useRef, useCallback, useEffect, useState } from 'react';
import type { WindowState, PanelId } from '../types';
import {
  bringToFront, moveWindow, closeWindow,
  subscribeFocus, getFocusedId, setFocusedWindow,
} from '../store/appStore';
import './FloatingWindow.css';

interface Props {
  win: WindowState;
  title: string;
  children: React.ReactNode;
}

export default function FloatingWindow({ win, title, children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // ── focus tracking ──────────────────────────────────────────────
  const [isFocused, setIsFocused] = useState(() => getFocusedId() === win.id);

  useEffect(() => {
    // sync focused state from store
    const unsub = subscribeFocus(() => {
      setIsFocused(getFocusedId() === win.id);
    });
    return unsub;
  }, [win.id]);

  // global mousedown listener — clicking outside any window clears focus
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!rootRef.current) return;
      // if click is outside this window, and this window is currently focused,
      // check if ANY window element contains the target before clearing
      if (!rootRef.current.contains(e.target as Node)) {
        if (getFocusedId() === win.id) {
          // another window's own mousedown will call bringToFront/setFocused —
          // only clear if no other window is being clicked
          // We use a small delay so sibling window mousedown fires first
          requestAnimationFrame(() => {
            if (getFocusedId() === win.id) {
              setFocusedWindow(null);
            }
          });
        }
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [win.id]);

  // ── drag via title bar ──────────────────────────────────────────
  const onTitleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.fw-action')) return;
    bringToFront(win.id); // also sets focus
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: win.x, origY: win.y };

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const frame = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--frame-size')
      ) || 12;
      const nx = Math.max(frame, dragRef.current.origX + ev.clientX - dragRef.current.startX);
      const ny = Math.max(frame, dragRef.current.origY + ev.clientY - dragRef.current.startY);
      moveWindow(win.id, nx, ny);
    }

    function onUp() {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    e.preventDefault();
  }, [win]);

  // clicking anywhere on the window body focuses it
  const onWindowMouseDown = useCallback(() => {
    bringToFront(win.id);
  }, [win.id]);

  return (
    <div
      ref={rootRef}
      className={`fw ${isFocused ? 'fw--focused' : ''}`}
      style={{
        left:    win.x,
        top:     win.y,
        width:   win.width,
        height:  win.height,
        zIndex:  win.zIndex,
      }}
      onMouseDown={onWindowMouseDown}
    >
      {/* title bar — drag handle */}
      <div className="fw-titlebar" onMouseDown={onTitleMouseDown}>
        <span className="fw-title hw-mono">{title}</span>
        <button
          className="fw-action fw-close hw-mono"
          onClick={() => closeWindow(win.id)}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* content */}
      <div className="fw-body">
        {children}
      </div>
    </div>
  );
}
