import { Resvg, initWasm } from "@resvg/resvg-wasm";

type MermaidImage = {
  dataUrl: string;
  width: number;
  height: number;
};

const RESVG_WASM_URL = new URL(
  "@resvg/resvg-wasm/index_bg.wasm",
  import.meta.url
);
const RESVG_READY_KEY = "__resvgReadyPromise";
const RESVG_READY_FLAG = "__resvgReady";

const ensureResvgReady = () => {
  const globalScope = globalThis as typeof globalThis & {
    [RESVG_READY_KEY]?: Promise<void>;
    [RESVG_READY_FLAG]?: boolean;
  };
  if (globalScope[RESVG_READY_FLAG]) {
    return Promise.resolve();
  }
  if (!globalScope[RESVG_READY_KEY]) {
    globalScope[RESVG_READY_KEY] = initWasm(fetch(RESVG_WASM_URL)).then(() => {
      globalScope[RESVG_READY_FLAG] = true;
    });
  }
  return globalScope[RESVG_READY_KEY]!.catch((error) => {
    if (String(error).includes("Already initialized")) {
      globalScope[RESVG_READY_FLAG] = true;
      return;
    }
    throw error;
  });
};

const FONT_URLS = [
  "/fonts/NotoSansSC-Regular.ttf",
  "/fonts/NotoEmoji-Regular.ttf",
];
let fontBuffersPromise: Promise<Uint8Array[]> | null = null;

const loadFontBuffers = async () => {
  if (fontBuffersPromise) return fontBuffersPromise;
  fontBuffersPromise = (async () => {
    const buffers: Uint8Array[] = [];
    for (const url of FONT_URLS) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        buffers.push(new Uint8Array(await response.arrayBuffer()));
      } catch {
        // Ignore single font load failure.
      }
    }
    return buffers;
  })();
  return fontBuffersPromise;
};

const uint8ToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const CROP_PADDING = 8;

const getSvgSize = (svg: string) => {
  const widthMatch = svg.match(/width="([0-9.]+)"/i);
  const heightMatch = svg.match(/height="([0-9.]+)"/i);
  if (widthMatch && heightMatch) {
    return {
      width: Number(widthMatch[1]),
      height: Number(heightMatch[1]),
    };
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

const ensureSvgNamespace = (svg: string) => {
  const match = svg.match(/^<svg\b([^>]*)>/i);
  if (!match) return svg;
  let attrs = match[1];
  if (!/\bxmlns=/.test(attrs)) {
    attrs += ' xmlns="http://www.w3.org/2000/svg"';
  }
  if (!/\bxmlns:xlink=/.test(attrs)) {
    attrs += ' xmlns:xlink="http://www.w3.org/1999/xlink"';
  }
  const updated = `<svg${attrs}>`;
  return svg.replace(/^<svg\b[^>]*>/i, updated);
};

const inlineSvgStyles = (svgEl: SVGElement) => {
  const elements = svgEl.querySelectorAll(
    "path, line, polyline, polygon, rect, circle, ellipse, text, tspan"
  );
  elements.forEach((element) => {
    const style = getComputedStyle(element);
    const setAttr = (name: string, value: string) => {
      if (!value) return;
      if (name === "stroke-dasharray" && (value === "none" || value === "0px")) {
        return;
      }
      element.setAttribute(name, value);
    };

    setAttr("stroke", style.stroke);
    setAttr("stroke-width", style.strokeWidth);
    setAttr("stroke-dasharray", style.strokeDasharray);
    setAttr("stroke-dashoffset", style.strokeDashoffset);
    setAttr("stroke-linecap", style.strokeLinecap);
    setAttr("stroke-linejoin", style.strokeLinejoin);
    setAttr("stroke-miterlimit", style.strokeMiterlimit);
    setAttr("fill", style.fill);
    setAttr("opacity", style.opacity);

    const tag = element.tagName.toLowerCase();
    if (tag === "text" || tag === "tspan") {
      setAttr("font-family", style.fontFamily);
      setAttr("font-size", style.fontSize);
      setAttr("font-weight", style.fontWeight);
      setAttr("font-style", style.fontStyle);
    }
  });
};

const cropSvgToBBox = (svg: string) => {
  if (typeof document === "undefined") return svg;
  const withNamespace = ensureSvgNamespace(svg);
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "-99999px";
  wrapper.style.width = "0";
  wrapper.style.height = "0";
  wrapper.style.overflow = "hidden";
  wrapper.style.visibility = "hidden";
  wrapper.style.pointerEvents = "none";
  wrapper.innerHTML = withNamespace;

  document.body.appendChild(wrapper);
  const svgEl = wrapper.querySelector("svg");
  if (!svgEl) {
    wrapper.remove();
    return withNamespace;
  }

  try {
    inlineSvgStyles(svgEl);
    const bbox = svgEl.getBBox();
    if (!Number.isFinite(bbox.width) || !Number.isFinite(bbox.height)) {
      return withNamespace;
    }
    if (bbox.width === 0 || bbox.height === 0) {
      return withNamespace;
    }

    const pad = CROP_PADDING;
    const x = bbox.x - pad;
    const y = bbox.y - pad;
    const width = bbox.width + pad * 2;
    const height = bbox.height + pad * 2;

    svgEl.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
    svgEl.setAttribute("width", String(width));
    svgEl.setAttribute("height", String(height));

    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgEl);
  } catch {
    return withNamespace;
  } finally {
    wrapper.remove();
  }
};

const normalizeSvg = (svg: string) => {
  const withNamespace = ensureSvgNamespace(svg);
  const parser = new DOMParser();
  const doc = parser.parseFromString(withNamespace, "image/svg+xml");
  const svgEl = doc.querySelector("svg");
  if (!svgEl) return withNamespace;
  const size = getSvgSize(withNamespace);
  svgEl.setAttribute("width", String(size.width));
  svgEl.setAttribute("height", String(size.height));
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgEl);
};

const MIN_PNG_WIDTH = 3000;
const RESVG_DPI = 300;

export const svgToPngDataUrl = async (
  svg: string,
  background: string | null
): Promise<MermaidImage> => {
  const cropped = cropSvgToBBox(svg);
  const normalized = normalizeSvg(cropped);
  const size = getSvgSize(normalized);
  const displayWidth = Math.max(size.width, MIN_PNG_WIDTH);
  const displayHeight = Math.round((displayWidth * size.height) / size.width);

  await ensureResvgReady();
  const fontBuffers = await loadFontBuffers();
  const options = {
    fitTo: { mode: "width" as const, value: Math.round(displayWidth) },
    background: background ?? undefined,
    dpi: RESVG_DPI,
    ...(fontBuffers.length
      ? {
          font: {
            fontBuffers,
            defaultFontFamily: "Noto Sans SC",
            sansSerifFamily: "Noto Sans SC",
          },
        }
      : {}),
  };
  const resvg = new Resvg(normalized, options);
  const rendered = resvg.render();
  const pngBuffer = rendered.asPng();
  const dataUrl = `data:image/png;base64,${uint8ToBase64(pngBuffer)}`;
  rendered.free();
  resvg.free();
  return {
    dataUrl,
    width: Math.round(displayWidth),
    height: Math.round(displayHeight),
  };
};

export type { MermaidImage };
