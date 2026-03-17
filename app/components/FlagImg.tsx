import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

interface FlagImgProps {
  src?: string;
  code?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  alt?: string;
  style?: CSSProperties;
}

// Width in pixels per size variant
const widthMap: Record<string, number> = {
  xs: 20,
  sm: 28,
  md: 40,
  lg: 56,
  xl: 80,
};

const localFlagMap: Record<string, string> = {
  DZ: "/flags/Algeria.png",
  BF: "/flags/Burkina-Faso.png",
  CM: "/flags/Cameroon.png",
  CV: "/flags/Cape_Verde.png",
  CI: "/flags/Côte d Ivoire.jpg",
  EG: "/flags/Egypt.png",
  GH: "/flags/Ghana.png",
  KE: "/flags/Kenya.png",
  MW: "/flags/Malawi.jpg",
  ML: "/flags/Mali.png",
  MA: "/flags/Morocco.png",
  NG: "/flags/Nigeria.png",
  SN: "/flags/Senegal.png",
  ZA: "/flags/South-Africa.png",
  TZ: "/flags/Tanzania.png",
  ZM: "/flags/Zambia.png",
};

export function FlagImg({ src, code, size = "md", className = "", alt, style }: FlagImgProps) {
  const normalizedCode = code?.toUpperCase();
  const lower = normalizedCode?.toLowerCase();
  const w = widthMap[size];
  const sources = useMemo(() => {
    const computedSources: Array<{ src: string; srcSet?: string }> = [];

    if (src) {
      computedSources.push({ src, srcSet: undefined });
    }

    if (!normalizedCode || !lower) {
      return computedSources;
    }

    const localCodeSrc = `/flags-by-code/${lower}.png`;
    const localSrc = localFlagMap[normalizedCode];
    const cdn1x = `https://flagcdn.com/w${w}/${lower}.png`;
    const cdn2x = `https://flagcdn.com/w${w * 2}/${lower}.png`;

    computedSources.push(
      { src: localCodeSrc, srcSet: undefined },
      ...(localSrc ? [{ src: localSrc, srcSet: undefined as string | undefined }] : []),
      { src: cdn2x, srcSet: `${cdn1x} 1x, ${cdn2x} 2x` },
    );

    return computedSources;
  }, [src, lower, normalizedCode, w]);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [src, normalizedCode, size]);

  const activeSource = sources[sourceIndex];

  if (!activeSource) {
    return (
      <span
        className={`flag-placeholder ${className}`}
        style={{ display: "inline-block", opacity: 0.35, ...style }}
      >
        🏳️
      </span>
    );
  }

  return (
    <img
      src={activeSource.src}
      srcSet={activeSource.srcSet}
      width={w * 1.5}
      height={w}
      alt={alt ?? normalizedCode ?? "Flag"}
      className={`flag-img flag-img--${size} ${className}`}
      style={{ width: `${w * 1.5}px`, height: `${w}px`, objectFit: "contain", borderRadius: "3px", flexShrink: 0, ...style }}
      onError={(e) => {
        if (sourceIndex < sources.length - 1) {
          setSourceIndex((index) => index + 1);
          return;
        }

        e.currentTarget.style.display = "none";
      }}
    />
  );
}
