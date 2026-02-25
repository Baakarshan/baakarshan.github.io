"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useTheme } from "@/components/theme/ThemeProvider";
import { svgToPngDataUrl, type MermaidImage } from "./mermaid-export";

const MIN_SCALE = 0.1;
const MAX_SCALE = 4;
const SCALE_STEP = 0.1;

type MediaType = "image" | "svg";

type Size = { width: number; height: number };

type MediaLightboxProps = {
  open: boolean;
  onClose: () => void;
  type: MediaType;
  src?: string;
  svg?: string;
  alt?: string;
  filename?: string;
};

const clamp = (value: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

const getSvgSize = (svg: string): Size => {
  const widthMatch = svg.match(/width="([0-9.]+)"/i);
  const heightMatch = svg.match(/height="([0-9.]+)"/i);
  if (widthMatch && heightMatch) {
    return { width: Number(widthMatch[1]), height: Number(heightMatch[1]) };
  }
  const viewBoxMatch = svg.match(/viewBox="([0-9.\s-]+)"/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
      return { width: parts[2], height: parts[3] };
    }
  }
  return { width: 800, height: 600 };
};

const ensureSvgSize = (svg: string) => {
  const match = svg.match(/^<svg\b([^>]*)>/i);
  if (!match) return svg;
  let attrs = match[1];
  if (!/\bxmlns=/.test(attrs)) {
    attrs += ' xmlns="http://www.w3.org/2000/svg"';
  }
  if (!/\bxmlns:xlink=/.test(attrs)) {
    attrs += ' xmlns:xlink="http://www.w3.org/1999/xlink"';
  }
  const size = getSvgSize(svg);
  if (!/\bwidth=/.test(attrs)) {
    attrs += ` width="${size.width}"`;
  }
  if (!/\bheight=/.test(attrs)) {
    attrs += ` height="${size.height}"`;
  }
  const updated = `<svg${attrs}>`;
  return svg.replace(/^<svg\b[^>]*>/i, updated);
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image load failed"));
    image.src = src;
  });

const loadImageSize = async (src: string): Promise<Size> => {
  const image = await loadImage(src);
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };
};

const imageToPngBlob = async (src: string): Promise<Blob | null> => {
  try {
    const response = await fetch(src, { mode: "cors" });
    if (!response.ok) throw new Error("fetch failed");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, image.naturalWidth || image.width);
    canvas.height = Math.max(1, image.naturalHeight || image.height);
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), "image/png")
    );
    URL.revokeObjectURL(url);
    return png;
  } catch {
    return null;
  }
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const normalizeFilename = (name: string) =>
  name.endsWith(".png") ? name : `${name}.png`;

const downloadDataUrl = async (dataUrl: string, filename: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  downloadBlob(blob, filename);
};

export const MediaLightbox = ({
  open,
  onClose,
  type,
  src,
  svg,
  alt,
  filename,
}: MediaLightboxProps) => {
  const { resolvedTheme } = useTheme();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<Size | null>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [pngImage, setPngImage] = useState<MermaidImage | null>(null);
  const [pngStatus, setPngStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    startTx: 0,
    startTy: 0,
    pointerId: 0,
    moved: false,
  });
  const scaleRef = useRef(scale);
  const translateRef = useRef(translate);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    translateRef.current = translate;
  }, [translate]);

  const displaySvg = useMemo(() => {
    if (!svg) return "";
    return ensureSvgSize(svg);
  }, [svg]);

  const theme = resolvedTheme === "dark" ? "dark" : "light";
  const pngBackground = theme === "dark" ? "#0d1117" : "#ffffff";

  const resolveFilename = useMemo(() => {
    if (filename) return normalizeFilename(filename);
    if (type === "svg") return "mermaid.png";
    if (!src) return "image.png";
    const clean = src.split("?")[0].split("#")[0];
    const base = clean.split("/").pop() || "image";
    const name = base.replace(/\.[^.]+$/, "");
    return normalizeFilename(name || "image");
  }, [filename, src, type]);

  useEffect(() => {
    if (!open || type !== "svg" || !svg) {
      setPngImage(null);
      setPngStatus("idle");
      return;
    }
    let active = true;
    setPngStatus("loading");
    svgToPngDataUrl(svg, pngBackground)
      .then((image) => {
        if (!active) return;
        setPngImage(image);
        setPngStatus("idle");
      })
      .catch((error) => {
        console.error("[MediaLightbox] SVG 转 PNG 失败", error);
        if (!active) return;
        setPngImage(null);
        setPngStatus("error");
      });
    return () => {
      active = false;
    };
  }, [open, type, svg, pngBackground]);

  const fitToView = useCallback(
    (targetScale?: number) => {
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport || !naturalSize) return;
      const fitScale = Math.min(
        viewport.width / naturalSize.width,
        viewport.height / naturalSize.height,
        1
      );
      const nextScale = clamp(
        typeof targetScale === "number" ? targetScale : fitScale
      );
      const offsetX = (viewport.width - naturalSize.width * nextScale) / 2;
      const offsetY = (viewport.height - naturalSize.height * nextScale) / 2;
      setScale(nextScale);
      setTranslate({ x: offsetX, y: offsetY });
    },
    [naturalSize]
  );

  useEffect(() => {
    if (!open) return;
    let active = true;
    const load = async () => {
      try {
        if (type === "image" && src) {
          const size = await loadImageSize(src);
          if (active) setNaturalSize(size);
        }
        if (type === "svg") {
          if (pngImage) {
            if (active)
              setNaturalSize({ width: pngImage.width, height: pngImage.height });
          } else if (displaySvg) {
            const size = getSvgSize(displaySvg);
            if (active) setNaturalSize(size);
          }
        }
      } catch {
        if (active) setNaturalSize({ width: 800, height: 600 });
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [open, src, type, displaySvg, pngImage]);

  useEffect(() => {
    if (!open || !naturalSize) return;
    fitToView();
    const handleResize = () => fitToView(scaleRef.current);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open, naturalSize, fitToView]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const zoomTo = useCallback(
    (nextScale: number, center?: { x: number; y: number }) => {
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport) return;
      const currentScale = scaleRef.current;
      const clamped = clamp(nextScale);
      const cx = center?.x ?? viewport.width / 2;
      const cy = center?.y ?? viewport.height / 2;
      const currentTranslate = translateRef.current;
      const imageX = (cx - currentTranslate.x) / currentScale;
      const imageY = (cy - currentTranslate.y) / currentScale;
      const nextX = cx - imageX * clamped;
      const nextY = cy - imageY * clamped;
      setScale(clamped);
      setTranslate({ x: nextX, y: nextY });
    },
    []
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!open) return;
      event.preventDefault();
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport) return;
      const zoomIn = event.deltaY < 0;
      const factor = zoomIn ? 1 + SCALE_STEP : 1 - SCALE_STEP;
      const nextScale = scaleRef.current * factor;
      const center = {
        x: event.clientX - viewport.left,
        y: event.clientY - viewport.top,
      };
      zoomTo(nextScale, center);
    },
    [open, zoomTo]
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    setDragging(true);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startTx: translateRef.current.x,
      startTy: translateRef.current.y,
      pointerId: event.pointerId,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      dragRef.current.moved = true;
    }
    setTranslate({
      x: dragRef.current.startTx + dx,
      y: dragRef.current.startTy + dy,
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    onClose();
  };

  const handleZoomIn = () =>
    zoomTo(scaleRef.current * (1 + SCALE_STEP));
  const handleZoomOut = () =>
    zoomTo(scaleRef.current * (1 - SCALE_STEP));
  const handleReset = () => fitToView(1);

  const handleDownload = async () => {
    if (type === "svg" && svg) {
      const image =
        pngImage ?? (await svgToPngDataUrl(svg, pngBackground));
      if (image) {
        await downloadDataUrl(image.dataUrl, resolveFilename);
        return;
      }
    }
    if (type === "image" && src) {
      const png = await imageToPngBlob(src);
      if (png) {
        downloadBlob(png, resolveFilename);
        return;
      }
      window.open(src, "_blank", "noopener,noreferrer");
    }
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="media-overlay" role="dialog" aria-label="Media preview">
      <div className="media-toolbar" aria-hidden="true">
        <div className="media-toolbar-group">
          <button
            type="button"
            className="media-control"
            onClick={handleZoomOut}
            aria-label="缩小"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M5 8h6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <div className="media-zoom-value">{Math.round(scale * 100)}%</div>
          <button
            type="button"
            className="media-control"
            onClick={handleZoomIn}
            aria-label="放大"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M8 5v6M5 8h6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <div className="media-divider" />
          <button
            type="button"
            className="media-control"
            onClick={handleReset}
            aria-label="原始尺寸"
          >
            1:1
          </button>
          <button
            type="button"
            className="media-control"
            onClick={handleDownload}
            aria-label="下载 PNG"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 3v7m0 0 3-3m-3 3-3-3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 12.5h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <button
        type="button"
        className="media-close"
        onClick={onClose}
        aria-label="关闭"
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div
        ref={viewportRef}
        className="media-canvas"
        onWheel={handleWheel}
        onClick={handleCanvasClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      >
        <div
          className="media-stage"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          }}
        >
          {type === "image" && src ? (
            <img src={src} alt={alt ?? ""} draggable={false} />
          ) : null}
          {type === "svg" && pngImage ? (
            <img
              src={pngImage.dataUrl}
              alt={alt ?? "mermaid"}
              draggable={false}
            />
          ) : null}
          {type === "svg" && !pngImage && displaySvg ? (
            <div
              className="media-svg"
              aria-busy={pngStatus === "loading"}
              dangerouslySetInnerHTML={{ __html: displaySvg }}
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};
