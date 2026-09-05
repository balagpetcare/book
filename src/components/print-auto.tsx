"use client";
import { useEffect } from "react";
export function PrintAuto() { useEffect(() => { const timer = window.setTimeout(() => window.print(), 350); return () => window.clearTimeout(timer); }, []); return <div className="print-controls"><button onClick={() => window.print()}>Print</button><button onClick={() => window.close()}>Close</button></div>; }
