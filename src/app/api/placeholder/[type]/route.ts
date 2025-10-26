import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import React from "react";

export const runtime = "edge";

const MAP: Record<string, { text: string; bg: string }> = {
  banner: { text: "Banner", bg: "linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)" },
  servicios: { text: "Servicios", bg: "linear-gradient(135deg, #ffe4e6 0%, #fbcfe8 100%)" },
  default: { text: "Mercado Productivo", bg: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)" },
};

export function GET(_req: NextRequest, { params }: { params: { type: string } }) {
  const { type } = params;
  const { text, bg } = MAP[type] ?? MAP.default;
  const width = 1200;
  const height = 400;

  const element = React.createElement(
    "div",
    {
      style: {
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        fontSize: 64,
        color: "#0f172a",
        fontWeight: 800,
        letterSpacing: "-0.04em",
      } as React.CSSProperties,
    },
    text
  );

  return new ImageResponse(element, { width, height });
}
