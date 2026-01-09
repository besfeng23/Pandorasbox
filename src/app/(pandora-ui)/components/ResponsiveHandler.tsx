"use client";
import { useEffect } from "react";

export default function ResponsiveHandler({ onMobile }: { onMobile: (mobile: boolean) => void }) {
  useEffect(() => {
    const check = () => onMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [onMobile]);
  return null;
}

