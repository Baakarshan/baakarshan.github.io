"use client";

import { useState } from "react";
import { X } from "lucide-react";

// 点击放大图片（纯前端实现）
export const ZoomImage = ({ src, alt = "", ...props }: any) => {
  const [open, setOpen] = useState(false);
  if (!src) return null;

  return (
    <>
      <img
        src={src}
        alt={alt}
        {...props}
        onClick={() => setOpen(true)}
        // 提示可点击放大
        className={`my-4 cursor-zoom-in rounded-md border border-[var(--color-border-default)] ${
          props.className ?? ""
        }`}
      />
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            className="absolute right-6 top-6 rounded-full bg-black/60 p-2 text-white"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
          <img
            src={src}
            alt={alt}
            onClick={(event) => event.stopPropagation()}
            // 最大化但保留屏幕边距，避免超出视口
            className="max-h-[90vh] max-w-[90vw] rounded-md border border-[var(--color-border-default)]"
          />
        </div>
      ) : null}
    </>
  );
};
