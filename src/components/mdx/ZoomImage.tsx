"use client";

import { useState } from "react";

import { MediaLightbox } from "./MediaLightbox";

// 单击放大图片（弹层查看 + 缩放/拖拽/下载）
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
        // 提示可单击放大
        className={`my-4 cursor-zoom-in rounded-md border border-[var(--color-border-default)] ${
          props.className ?? ""
        }`}
      />
      <MediaLightbox
        open={open}
        onClose={() => setOpen(false)}
        type="image"
        src={src}
        alt={alt}
      />
    </>
  );
};
