export interface Notification {
  id: string;
  type: "success" | "error" | "info" | "loading";
  message: string;
}

export interface ProcessStep {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed" | "error";
}

export interface ExcelProperties {
  title?: string;
  subject?: string;
  creator?: string; // Author
  keywords?: string; // Tags
  description?: string; // Comments
  lastModifiedBy?: string;
  created?: Date;
  modified?: Date;
  category?: string;
  contentStatus?: string;
  company?: string;
  manager?: string;
  revision?: string;
  version?: string;
  programName?: string;
  lastPrinted?: Date;
  scale?: boolean;
  linksDirty?: boolean;
  language?: string;
}
