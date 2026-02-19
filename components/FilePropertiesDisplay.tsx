import React, { useState, useEffect } from "react";
import { ExcelProperties } from "../types";
import { Icons } from "./Icons";

interface FilePropertiesDisplayProps {
  file: File | null;
  properties: ExcelProperties | null;
  onSave: (newProps: ExcelProperties) => Promise<void>;
}

export const FilePropertiesDisplay: React.FC<FilePropertiesDisplayProps> = ({
  file,
  properties,
  onSave,
}) => {
  const [editedProps, setEditedProps] = useState<ExcelProperties>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (properties) {
      setEditedProps(properties);
    }
  }, [properties]);

  if (!file) return null;

  const handleChange = (field: keyof ExcelProperties, value: any) => {
    setEditedProps((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(editedProps);
    setIsSaving(false);
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
  ) => {
    return (
      <div className="flex py-2 items-start">
        <label className="w-1/3 text-slate-500 text-sm mt-1">{label}</label>
        <div className="w-2/3">
          {multiline ? (
            <textarea
              className="w-full text-sm text-slate-800 border-slate-200 rounded-md focus:ring-brand-500 focus:border-brand-500"
              rows={2}
              value={editedProps[field] || ""}
              onChange={(e) => handleChange(field, e.target.value)}
            />
          ) : (
            <input
              type="text"
              className="w-full text-sm text-slate-800 border-slate-200 rounded-md focus:ring-brand-500 focus:border-brand-500 h-8"
              value={editedProps[field] || ""}
              onChange={(e) => handleChange(field, e.target.value)}
            />
          )}
        </div>
      </div>
    );
  };

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
    <div className="mb-4">
      <h4 className="text-brand-600 font-semibold border-b border-brand-100 mb-2 pb-1 text-sm">
        {title}
      </h4>
      <div className="space-y-1">{children}</div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8 max-w-2xl mx-auto">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800">File Properties</h3>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="animate-spin -ml-1 mr-2 h-4 w-4 text-white border-2 border-white rounded-full border-t-transparent"></div>
              Saving...
            </>
          ) : (
            <>
              <Icons.Save className="-ml-1 mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
      <div className="p-6">
        {/* Description Section */}
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

        {/* Origin Section */}
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
            {renderReadOnlyRow(
              "Content created",
              formatDate(properties?.created),
            )}
            {renderReadOnlyRow(
              "Date last saved",
              formatDate(properties?.modified),
            )}
            {renderReadOnlyRow(
              "Last printed",
              formatDate(properties?.lastPrinted),
            )}
          </>,
        )}

        {/* Content Section */}
        {renderSection(
          "Content",
          <>
            {renderInputRow("Content status", "contentStatus")}
            {renderInputRow("Language", "language")}
            {renderReadOnlyRow(
              "Content type",
              file.type || "application/vnd.ms-excel",
            )}
            {renderReadOnlyRow("Scale", properties?.scale ? "Yes" : "No")}
            {renderReadOnlyRow(
              "Links dirty?",
              properties?.linksDirty ? "Yes" : "No",
            )}
          </>,
        )}

        {/* File Section */}
        {renderSection(
          "File",
          <>
            {renderReadOnlyRow("Name", file.name)}
            {renderReadOnlyRow(
              "Type",
              file.name.endsWith(".xlsx")
                ? "Microsoft Excel Worksheet"
                : "Excel File",
            )}
            {renderReadOnlyRow("Location", "Local Browser Memory")}
            {renderReadOnlyRow("Size", formatSize(file.size))}
            {renderReadOnlyRow(
              "Date created",
              formatDate(new Date(file.lastModified)),
            )}
            {renderReadOnlyRow(
              "Date modified",
              formatDate(new Date(file.lastModified)),
            )}
            {renderReadOnlyRow("Attributes", "A")}
          </>,
        )}
      </div>
    </div>
  );
};
