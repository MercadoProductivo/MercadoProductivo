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
  const { width, height, maskable } = getSizeFromIconName(icon);
  
  // Para iconos maskable, agregamos más padding
  const padding = maskable ? Math.round(width * 0.15) : 0;
  
  const element = React.createElement(
    "div",
    {
      style: {
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f06d04 0%, #ff8c42 100%)",
        padding: `${padding}px`,
      } as React.CSSProperties,
    },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: maskable ? "#f06d04" : "transparent",
          borderRadius: maskable ? "20%" : "0",
        } as React.CSSProperties,
      },
      React.createElement(
        "div",
        {
          style: {
            color: "#fff",
            fontSize: Math.round(Math.min(width, height) * 0.38),
            fontWeight: 900,
            letterSpacing: "-0.05em",
            textShadow: "0 4px 8px rgba(0,0,0,0.2)",
          } as React.CSSProperties,
        },
        "MP"
      )
    )
  );

  return new ImageResponse(element, { width, height });
}
