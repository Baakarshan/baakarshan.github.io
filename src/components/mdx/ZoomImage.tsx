"use client";

import { useState } from "react";

import { MediaLightbox } from "./MediaLightbox";

// 单击放大图片（弹层查看 + 缩放/拖拽/下载）
export const ZoomImage = ({ src, alt = "", ...props }: any) => {
  const [open, setOpen] = useState(false);
  if (!src) return null;

  return (
    <>
      <div
        className={`image-block ${props.className ?? ""}`}
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        aria-label={alt ? `查看图片：${alt}` : "查看图片"}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <img src={src} alt={alt} {...props} draggable={false} />
      </div>
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
