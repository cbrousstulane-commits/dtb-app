// apps/web/app/admin/layout.tsx
import React from "react";
import AdminLayoutClient from "@/components/admin/AdminLayoutClient";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}