"use client";

import { Component, type ReactNode } from "react";

export class PreviewBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message || "预览渲染失败" };
  }

  render() {
    if (this.state.message) {
      return (
        <div className="sheet grid place-items-center bg-white p-8 text-sm text-red-700">
          这一段内容无法预览：{this.state.message}
        </div>
      );
    }
    return this.props.children;
  }
}
