import React, { useState, useCallback } from "react";
import { Icons } from "./components/Icons";
import { NotificationToast } from "./components/NotificationToast";
import { ExcelService } from "./services/excelService";
import { ExcelProperties, Notification } from "./types";
import { Footer } from "./components/Footer";
import { FilePropertiesDisplay } from "./components/FilePropertiesDisplay";
import { PropertiesEditor } from "./components/PropertiesEditor";
import saveAs from "file-saver";

type AppTab = "unprotect" | "properties";

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("unprotect");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFile, setProcessedFile] = useState<Blob | null>(null);
  const [wasProtected, setWasProtected] = useState<boolean | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>("");
  const [processStep, setProcessStep] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [showLegacyError, setShowLegacyError] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [fileProperties, setFileProperties] = useState<ExcelProperties | null>(
    null,
  );

  const addNotification = useCallback(
    (type: Notification["type"], message: string) => {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications((prev) => [...prev, { id, type, message }]);
      return id;
    },
    [],
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Common file processor
  const processFile = async (file: File) => {
    setProcessedFile(null);
    setWasProtected(null);
    setShowLegacyError(false);
    setCurrentFile(file);
    setFileProperties(null);

    const lowerName = file.name.toLowerCase();

    // Specific handling for legacy .xls files
    if (lowerName.endsWith(".xls")) {
      setOriginalFileName(file.name);
      setShowLegacyError(true);
      return;
    }

    if (!lowerName.endsWith(".xlsx")) {
      addNotification("error", "Please upload a valid Excel file (.xlsx).");
      return;
    }

    setOriginalFileName(file.name);
    setIsProcessing(true);
    setProcessStep("Starting upload...");

    const loadingId = addNotification("loading", "Processing your file...");

    try {
      // Extract properties immediately
      const props = await ExcelService.getProperties(file);
      setFileProperties(props);

      const { blob, wasProtected } = await ExcelService.unprotectFile(
        file,
        (step) => {
          setProcessStep(step);
        },
      );

      setProcessedFile(blob);
      setWasProtected(wasProtected);
      removeNotification(loadingId);

      if (wasProtected) {
        addNotification(
          "success",
          "Protection detected and removed successfully.",
        );
      } else {
        addNotification(
          "info",
          "No protection found. File is already editable.",
        );
      }
    } catch (error: any) {
      removeNotification(loadingId);
      addNotification(
        "error",
        error.message || "An unexpected error occurred.",
      );
      setProcessedFile(null);
      setWasProtected(null);
    } finally {
      setIsProcessing(false);
      setProcessStep("");
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
    }
    // Reset input so same file can be selected again later if needed
    event.target.value = "";
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
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleDownload = async () => {
    if (!processedFile) return;

    const nameWithoutExt = originalFileName.replace(/\.xlsx$/i, "");
    const suffix = wasProtected ? "unlocked" : "processed";
    const newName = `${nameWithoutExt}_${suffix}.xlsx`;

    // Apply any pending property edits before downloading
    let finalBlob = processedFile;
    if (fileProperties) {
      try {
        finalBlob = await ExcelService.updateProperties(
          processedFile,
          fileProperties,
        );
      } catch (error: any) {
        addNotification(
          "error",
          "Failed to apply properties: " + error.message,
        );
        return;
      }
    }

    saveAs(finalBlob, newName);
    addNotification("success", `Downloaded ${newName}`);
  };

  const handleSaveProperties = async (newProps: ExcelProperties) => {
    // Instant: just update state, defer expensive zip work to download
    setFileProperties(newProps);
    addNotification("success", "Properties saved!");
  };

  const tabConfig = [
    {
      id: "unprotect" as AppTab,
      label: "Unprotect",
      icon: <Icons.Unlock className="w-4 h-4" />,
      description: "Remove sheet & workbook protection",
    },
    {
      id: "properties" as AppTab,
      label: "Edit Properties",
      icon: <Icons.FileSpreadsheet className="w-4 h-4" />,
      description: "View & edit file metadata",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2 text-brand-600">
              <Icons.Unlock className="w-8 h-8" />
              <span className="font-bold text-xl tracking-tight text-slate-900">
                ExcelUnprotect
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            {activeTab === "unprotect" ? (
              <>
                Unlock your spreadsheets <br />
                <span className="text-brand-600">in seconds.</span>
              </>
            ) : (
              <>
                Edit file properties <br />
                <span className="text-brand-600">with ease.</span>
              </>
            )}
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-slate-500">
            {activeTab === "unprotect"
              ? "Remove sheet and workbook protection instantly. Secure, client-side processing means your data never leaves your browser."
              : "View and modify Excel file metadata for both .xlsx and .xls files. Everything happens locally in your browser."}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white rounded-xl shadow-sm border border-slate-200 p-1.5">
            {tabConfig.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-brand-600 text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8 sm:p-12">
            {/* === UNPROTECT TAB === */}
            {activeTab === "unprotect" && (
              <>
                {/* Upload Area */}
                {!processedFile && !isProcessing && !showLegacyError && (
                  <div className="w-full">
                    <label
                      htmlFor="file-upload"
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
                          Modern Excel files (.xlsx)
                        </p>
                      </div>
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                      />
                    </label>
                    <div className="mt-6 flex items-start space-x-3 text-sm text-slate-500 bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <Icons.ShieldAlert className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <p>
                        <strong>Note:</strong> This tool removes{" "}
                        <em>Sheet Protection</em> and{" "}
                        <em>Workbook Structure Protection</em>. <br />
                        Only <strong>.xlsx</strong> files are supported to
                        ensure your formatting is preserved perfectly.
                      </p>
                    </div>
                  </div>
                )}

                {/* Legacy Format Instruction State */}
                {showLegacyError && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-left animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-start mb-4">
                      <div className="p-2 bg-orange-100 rounded-lg mr-3">
                        <Icons.AlertCircle className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-orange-900">
                          Legacy File Detected (.xls)
                        </h3>
                        <p className="text-orange-800 mt-1">
                          We noticed you uploaded{" "}
                          <strong>{originalFileName}</strong>. To prevent
                          formatting loss, we only support modern{" "}
                          <strong>.xlsx</strong> files.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-orange-100 shadow-sm">
                      <h4 className="font-semibold text-slate-900 mb-3">
                        How to fix this (takes 30 seconds):
                      </h4>
                      <ol className="list-decimal list-inside space-y-2 text-slate-700 text-sm">
                        <li>
                          Open your file in <strong>Excel</strong>.
                        </li>
                        <li>
                          Click on <strong>File {">"} Save As</strong>.
                        </li>
                        <li>
                          Select <strong>Excel Workbook (*.xlsx)</strong> from
                          the format dropdown.
                        </li>
                        <li>
                          Upload the new <strong>.xlsx</strong> file here.
                        </li>
                      </ol>
                    </div>

                    <button
                      onClick={() => setShowLegacyError(false)}
                      className="mt-6 w-full py-3 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {/* Processing State */}
                {isProcessing && (
                  <div className="flex flex-col items-center justify-center h-64">
                    <div className="relative w-24 h-24 mb-6">
                      <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
                      <Icons.FileSpreadsheet className="absolute inset-0 m-auto w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                      Processing File
                    </h3>
                    <p className="text-slate-500 animate-pulse">
                      {processStep}
                    </p>
                  </div>
                )}

                {/* Success/Download State */}
                {processedFile && !isProcessing && (
                  <div className="text-center py-6 animate-in fade-in duration-500">
                    {wasProtected ? (
                      <>
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-full mb-6">
                          <Icons.ShieldAlert className="w-10 h-10 text-orange-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                          Protection Removed!
                        </h2>
                        <p className="text-slate-600 mb-8 max-w-lg mx-auto">
                          We detected protection in{" "}
                          <span className="font-semibold text-slate-900">
                            {originalFileName}
                          </span>{" "}
                          and successfully removed it.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                          <Icons.CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                          No Protection Detected
                        </h2>
                        <p className="text-slate-600 mb-8 max-w-lg mx-auto">
                          <span className="font-semibold text-slate-900">
                            {originalFileName}
                          </span>{" "}
                          was already unprotected. We've saved a clean copy for
                          you below.
                        </p>
                      </>
                    )}

                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                      <button
                        onClick={handleDownload}
                        className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 shadow-lg hover:shadow-xl transition-all"
                      >
                        <Icons.Download className="w-5 h-5 mr-2" />
                        Download File
                      </button>

                      <button
                        onClick={() => {
                          setProcessedFile(null);
                          setOriginalFileName("");
                          setWasProtected(null);
                          setCurrentFile(null);
                          setFileProperties(null);
                        }}
                        className="inline-flex items-center justify-center px-8 py-4 border border-slate-300 text-lg font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all"
                      >
                        Process Another File
                      </button>
                    </div>
                  </div>
                )}

                {/* File Properties Display (inline in unprotect tab) */}
                {currentFile && fileProperties && (
                  <FilePropertiesDisplay
                    file={currentFile}
                    properties={fileProperties}
                    onSave={handleSaveProperties}
                  />
                )}
              </>
            )}

            {/* === PROPERTIES TAB === */}
            {activeTab === "properties" && (
              <PropertiesEditor addNotification={addNotification} />
            )}
          </div>
        </div>
      </main>

      {/* Notifications Container */}
      <div className="fixed bottom-4 left-4 z-40 w-full max-w-sm flex flex-col space-y-2 pointer-events-none">
        <div className="pointer-events-auto">
          {notifications.map((n) => (
            <NotificationToast
              key={n.id}
              notification={n}
              onDismiss={removeNotification}
            />
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
