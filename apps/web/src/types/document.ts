export type DocumentModuleId =
  | "pdf"
  | "word"
  | "excel"
  | "powerpoint"
  | "images"
  | "cloud-documents"
  | "folders"
  | "templates"
  | "ai";

export type DocumentModuleStatus = "active" | "planned";

export type DocumentModule = {
  id: DocumentModuleId;
  label: string;
  status: DocumentModuleStatus;
};
