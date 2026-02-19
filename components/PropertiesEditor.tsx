import React, { useState, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import saveAs from "file-saver";
import { Icons } from "./Icons";
import { ExcelProperties } from "../types";
import { ExcelService } from "../services/excelService";

interface PropertiesEditorProps {
  addNotification: (
    type: "success" | "error" | "info" | "loading",
    message: string,
  ) => string;
}

export const PropertiesEditor: React.FC<PropertiesEditorProps> = ({
  addNotification,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editedProps, setEditedProps] = useState<ExcelProperties>({});
  const [originalProps, setOriginalProps] = useState<ExcelProperties>({});
  const [isXls, setIsXls] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleFile = async (f: File) => {
    const lowerName = f.name.toLowerCase();
    if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls")) {
      addNotification("error", "Please upload an Excel file (.xlsx or .xls).");
      return;
    }

    setFile(f);
    setIsXls(lowerName.endsWith(".xls"));
    setIsLoading(true);

    try {
      let props: ExcelProperties = {};

      if (lowerName.endsWith(".xls")) {
        // Use SheetJS for .xls files
        const arrayBuffer = await f.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: "array", bookProps: true });
        const p = wb.Props || {};
        const cp = wb.Custprops || {};

        props = {
          title: p.Title,
          subject: p.Subject,
          creator: p.Author,
          keywords: p.Keywords,
          description: p.Comments,
          lastModifiedBy: p.LastAuthor,
          created: p.CreatedDate ? new Date(p.CreatedDate) : undefined,
          modified: p.ModifiedDate ? new Date(p.ModifiedDate) : undefined,
          category: p.Category,
          contentStatus: p.ContentStatus,
          company: p.Company,
          manager: p.Manager,
          revision: p.Revision != null ? String(p.Revision) : undefined,
          version: p.Version != null ? String(p.Version) : undefined,
          programName: p.Application,
          lastPrinted: p.LastPrinted ? new Date(p.LastPrinted) : undefined,
          language: p.Language,
        };
      } else {
        // Use existing JSZip approach for .xlsx files
        props = await ExcelService.getProperties(f);
      }

      setEditedProps(props);
      setOriginalProps(props);
      addNotification("success", `Loaded properties from ${f.name}`);
    } catch (error: any) {
      addNotification(
        "error",
        "Failed to read file properties: " + error.message,
      );
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) await handleFile(f);
    e.target.value = "";
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, []);

  const handleChange = (field: keyof ExcelProperties, value: any) => {
    setEditedProps((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveAndDownload = async () => {
    if (!file) return;
    setIsSaving(true);

    try {
      let outputBlob: Blob;
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith(".xls")) {
        // Use SheetJS to write updated .xls
        const arrayBuffer = await file.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: "array" });

        // Update workbook properties
        if (!wb.Props) wb.Props = {};
        wb.Props.Title = editedProps.title || "";
        wb.Props.Subject = editedProps.subject || "";
        wb.Props.Author = editedProps.creator || "";
        wb.Props.Keywords = editedProps.keywords || "";
        wb.Props.Comments = editedProps.description || "";
        wb.Props.LastAuthor = editedProps.lastModifiedBy || "";
        wb.Props.Category = editedProps.category || "";
        wb.Props.ContentStatus = editedProps.contentStatus || "";
        wb.Props.Company = editedProps.company || "";
        wb.Props.Manager = editedProps.manager || "";
        wb.Props.Revision = editedProps.revision || "";
        wb.Props.Version = editedProps.version || "";
        wb.Props.Application = editedProps.programName || "";
        wb.Props.Language = editedProps.language || "";

        // Write back as .xls (BIFF8)
        const wbout = XLSX.write(wb, { bookType: "xls", type: "array" });
        outputBlob = new Blob([wbout], {
          type: "application/vnd.ms-excel",
        });
      } else {
        // Use existing JSZip approach for .xlsx
        outputBlob = await ExcelService.updateProperties(file, editedProps);
      }

      const ext = lowerName.endsWith(".xls") ? ".xls" : ".xlsx";
      const baseName = file.name.replace(/\.(xlsx|xls)$/i, "");
      const newName = `${baseName}_edited${ext}`;

      saveAs(outputBlob, newName);
      addNotification(
        "success",
        `Downloaded ${newName} with updated properties!`,
      );
    } catch (error: any) {
      addNotification("error", "Failed to save properties: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setEditedProps({});
    setOriginalProps({});
    setIsXls(false);
  };

  const formatDate = (date?: Date) => {
    if (!date) return "";
    return date.toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const renderInputRow = (
    label: string,
    field: keyof ExcelProperties,
    multiline: boolean = false,
  ) => (
    <div className="flex py-2 items-start">
      <label className="w-1/3 text-slate-500 text-sm mt-1">{label}</label>
      <div className="w-2/3">
        {multiline ? (
          <textarea
            className="w-full text-sm text-slate-800 border border-slate-200 rounded-md px-3 py-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
            rows={2}
            value={(editedProps[field] as string) || ""}
            onChange={(e) => handleChange(field, e.target.value)}
          />
        ) : (
          <input
            type="text"
            className="w-full text-sm text-slate-800 border border-slate-200 rounded-md px-3 py-1.5 h-8 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
            value={(editedProps[field] as string) || ""}
            onChange={(e) => handleChange(field, e.target.value)}
          />
        )}
      </div>
    </div>
  );

  const toDatetimeLocal = (date?: Date) => {
    if (!date) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const renderDateRow = (label: string, field: keyof ExcelProperties) => (
    <div className="flex py-2 items-start">
      <label className="w-1/3 text-slate-500 text-sm mt-1">{label}</label>
      <div className="w-2/3">
        <input
          type="datetime-local"
          className="w-full text-sm text-slate-800 border border-slate-200 rounded-md px-3 py-1.5 h-8 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
          value={toDatetimeLocal(editedProps[field] as Date | undefined)}
          onChange={(e) => {
            const val = e.target.value;
            handleChange(field, val ? new Date(val) : undefined);
          }}
        />
      </div>
    </div>
  );

  const renderReadOnlyRow = (
    label: string,
    value: string | undefined | null,
  ) => {
    if (!value) return null;
    return (
      <div className="flex py-1">
        <div className="w-1/3 text-slate-500 text-sm">{label}</div>
        <div className="w-2/3 text-slate-800 text-sm font-medium break-words">
          {value}
        </div>
      </div>
    );
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <div className="mb-5">
      <h4 className="text-brand-600 font-semibold border-b border-brand-100 mb-2 pb-1 text-sm uppercase tracking-wider">
        {title}
      </h4>
      <div className="space-y-1">{children}</div>
    </div>
  );

  // Upload state
  if (!file) {
    return (
      <div className="w-full">
        <label
          htmlFor="props-file-upload"
          className={`group relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
            isDragging
              ? "border-brand-500 bg-brand-50 scale-[1.02] shadow-lg"
              : "border-slate-300 bg-slate-50 hover:bg-brand-50 hover:border-brand-300"
          }`}
          onDragOver={onDragOver}
          onDragEnter={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <div
              className={`p-4 rounded-full shadow-sm mb-4 transition-transform duration-300 ${
                isDragging
                  ? "bg-brand-100 scale-110"
                  : "bg-white group-hover:scale-110"
              }`}
            >
              <Icons.Upload
                className={`w-8 h-8 ${isDragging ? "text-brand-600" : "text-brand-500"}`}
              />
            </div>
            <p
              className={`mb-2 text-lg font-medium ${isDragging ? "text-brand-700" : "text-slate-700"}`}
            >
              {isDragging
                ? "Drop file here"
                : "Click to upload or drag and drop"}
            </p>
            <p
              className={`text-sm ${isDragging ? "text-brand-600" : "text-slate-500"}`}
            >
              Excel files (.xlsx and .xls)
            </p>
          </div>
          <input
            id="props-file-upload"
            type="file"
            className="hidden"
            accept=".xlsx,.xls"
            onChange={handleUpload}
          />
        </label>
        <div className="mt-6 flex items-start space-x-3 text-sm text-slate-500 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
          <Icons.FileSpreadsheet className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p>
            <strong>Edit Properties:</strong> Upload any Excel file (.xlsx or
            .xls) to view and edit its metadata properties like Title, Author,
            Company, and more.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
          <Icons.FileSpreadsheet className="absolute inset-0 m-auto w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">
          Reading Properties
        </h3>
        <p className="text-slate-500 animate-pulse">Extracting metadata...</p>
      </div>
    );
  }

  // Editor state
  return (
    <div>
      {/* File info bar */}
      <div className="flex items-center justify-between mb-6 bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="flex items-center space-x-3">
          <Icons.FileSpreadsheet className="w-8 h-8 text-brand-500" />
          <div>
            <p className="font-semibold text-slate-800">{file.name}</p>
            <p className="text-sm text-slate-500">
              {formatSize(file.size)} •{" "}
              {isXls ? ".xls (Legacy)" : ".xlsx (Modern)"}
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="text-sm text-slate-500 hover:text-slate-700 underline"
        >
          Change file
        </button>
      </div>

      {/* Properties form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Edit Properties</h3>
          <button
            onClick={handleSaveAndDownload}
            disabled={isSaving}
            className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-all"
          >
            {isSaving ? (
              <>
                <div className="animate-spin -ml-1 mr-2 h-4 w-4 text-white border-2 border-white rounded-full border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <Icons.Download className="-ml-1 mr-2 h-4 w-4" />
                Save &amp; Download
              </>
            )}
          </button>
        </div>
        <div className="p-6">
          {renderSection(
            "Description",
            <>
              {renderInputRow("Title", "title")}
              {renderInputRow("Subject", "subject")}
              {renderInputRow("Tags", "keywords")}
              {renderInputRow("Categories", "category")}
              {renderInputRow("Comments", "description", true)}
            </>,
          )}

          {renderSection(
            "Origin",
            <>
              {renderInputRow("Authors", "creator")}
              {renderInputRow("Last saved by", "lastModifiedBy")}
              {renderInputRow("Revision number", "revision")}
              {renderInputRow("Version number", "version")}
              {renderInputRow("Program name", "programName")}
              {renderInputRow("Company", "company")}
              {renderInputRow("Manager", "manager")}
              {renderDateRow("Content created", "created")}
              {renderDateRow("Date last saved", "modified")}
              {renderDateRow("Last printed", "lastPrinted")}
            </>,
          )}

          {renderSection(
            "Content",
            <>
              {renderInputRow("Content status", "contentStatus")}
              {renderInputRow("Language", "language")}
            </>,
          )}

          {renderSection(
            "File",
            <>
              {renderReadOnlyRow("Name", file.name)}
              {renderReadOnlyRow(
                "Type",
                isXls
                  ? "Microsoft Excel 97-2003 Worksheet"
                  : "Microsoft Excel Worksheet",
              )}
              {renderReadOnlyRow("Size", formatSize(file.size))}
              {renderReadOnlyRow(
                "Date modified",
                formatDate(new Date(file.lastModified)),
              )}
            </>,
          )}
        </div>
      </div>
    </div>
  );
};
