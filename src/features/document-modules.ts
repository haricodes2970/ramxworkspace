import type { DocumentModule } from "@/types/document";

export const DOCUMENT_MODULES: DocumentModule[] = [
  {
    id: "pdf",
    label: "PDF Workspace",
    status: "active",
  },
  {
    id: "word",
    label: "Word",
    status: "planned",
  },
  {
    id: "excel",
    label: "Excel",
    status: "planned",
  },
  {
    id: "powerpoint",
    label: "PowerPoint",
    status: "planned",
  },
  {
    id: "images",
    label: "Images",
    status: "planned",
  },
];
