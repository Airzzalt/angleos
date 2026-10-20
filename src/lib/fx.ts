import type { CSSProperties } from "react";

/** Orders entrance animations: <div className="reveal" style={stagger(2)} /> */
export const stagger = (i: number): CSSProperties => ({ ["--i" as string]: i }) as CSSProperties;
