"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type HeroImageRotatorProps = {
  alt: string;
  images: string[];
  sizes: string;
};

export function HeroImageRotator({ alt, images, sizes }: HeroImageRotatorProps) {
  const imageList = useMemo(() => (images.length > 0 ? images : ["/landing/travel-lifestyle.png"]), [images]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (imageList.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % imageList.length);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [imageList]);

  return (
    <div className="hero-image-rotator absolute inset-0">
      {imageList.map((src, imageIndex) => (
        <Image
          key={src}
          src={src}
          alt={alt}
          fill
          className={`hero-image-layer object-cover ${imageIndex === index ? "is-active" : ""}`}
          sizes={sizes}
          priority={imageIndex === 0}
          suppressHydrationWarning
        />
      ))}
    </div>
  );
}
