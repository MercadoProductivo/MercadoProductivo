import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import React from "react";

export const runtime = "edge";

function getSizeFromIconName(name: string): { width: number; height: number; maskable?: boolean } {
  switch (name) {
    case "icon-192.png":
      return { width: 192, height: 192 };
    case "icon-512.png":
      return { width: 512, height: 512 };
    case "icon-512-maskable.png":
      return { width: 512, height: 512, maskable: true };
    default:
      return { width: 192, height: 192 };
  }
}

export async function GET(_req: NextRequest, { params }: { params: { icon: string } }) {
  const { icon } = params;
  const { width, height } = getSizeFromIconName(icon);
  const element = React.createElement(
    "div",
    {
      style: {
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f06d04",
        color: "#fff",
        fontSize: Math.round(Math.min(width, height) * 0.42),
        fontWeight: 800,
        letterSpacing: "-0.04em",
      } as React.CSSProperties,
    },
    "MP"
  );

  return new ImageResponse(element, { width, height });
}
