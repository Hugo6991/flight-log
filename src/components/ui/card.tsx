import type { HTMLAttributes } from "react";

export function Card({
  className = "",
  material = "solid",
  ...props
}: HTMLAttributes<HTMLDivElement> & { material?: "solid" | "glass" }) {
  return (
    <div
      className={`ui-card ${className}`}
      data-material={material}
      {...props}
    />
  );
}
