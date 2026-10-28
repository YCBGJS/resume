"use client";

import dynamic from "next/dynamic";

const Workbench = dynamic(() => import("@/components/Workbench").then((mod) => mod.Workbench), {
  ssr: false,
  loading: () => <p className="p-6 text-sm">正在打开编辑器…</p>,
});

export default function Home() {
  return <Workbench />;
}
