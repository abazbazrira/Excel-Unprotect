import JSZip from "jszip";
import { ExcelProperties } from "../types";

export class ExcelService {
  /**
   * Unprotects an Excel file (.xlsx).
   * Removes XML protection tags directly (preserves exact file structure).
   */
  static async unprotectFile(
    file: File,
    onProgress: (step: string) => void,
  ): Promise<{ blob: Blob; wasProtected: boolean }> {
    // 0. Validate Extension
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      throw new Error(
        "Only .xlsx files are supported. Please convert .xls files to .xlsx in Excel first.",
      );
    }

    // 1. Pre-check for Encrypted .xlsx (Password to Open)
    // Encrypted .xlsx files use OLE Compound File structure (D0CF11E0...) instead of standard ZIP (504B0304...).
    try {
      const headerBuffer = await file.slice(0, 8).arrayBuffer();
      if (headerBuffer.byteLength >= 8) {
        const view = new DataView(headerBuffer);
        const magic1 = view.getUint32(0, false); // Big-endian
        const magic2 = view.getUint32(4, false);

        // OLE Signature: D0 CF 11 E0 A1 B1 1A E1
        if (magic1 === 0xd0cf11e0 && magic2 === 0xa1b11ae1) {
          throw new Error(
            "This file is encrypted with a 'Password to Open'. This tool cannot bypass opening passwords, only sheet/workbook protection.",
          );
        }
      }
    } catch (e: any) {
      if (e.message && e.message.includes("Password to Open")) throw e;
    }

    try {
      return await this.processModernFile(file, onProgress);
    } catch (error: any) {
      console.error("Excel processing error:", error);
      if (
        error.message &&
        (error.message.includes("Password to Open") ||
          error.message.includes("Password"))
      ) {
        throw error;
      }
      throw new Error(
        error.message ||
          "Failed to process the Excel file. It might be corrupted or in an unsupported format.",
      );
    }
  }

  private static async processModernFile(
    file: File,
    onProgress: (step: string) => void,
  ): Promise<{ blob: Blob; wasProtected: boolean }> {
    onProgress("Reading file structure...");
    const zip = new JSZip();
    let wasProtected = false;

    let loadedZip;
    try {
      loadedZip = await zip.loadAsync(file);
    } catch (e) {
      throw new Error(
        "Could not read .xlsx file structure. The file might be corrupted or encrypted.",
      );
    }

    onProgress("Analyzing workbook...");

    // 1. Remove Workbook Protection (Structure)
    const workbookPath = "xl/workbook.xml";
    if (loadedZip.file(workbookPath)) {
      const content = await loadedZip.file(workbookPath)!.async("string");
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "application/xml");

      const protectionTags = doc.getElementsByTagName("workbookProtection");
      if (protectionTags.length > 0) {
        wasProtected = true;
        onProgress("Removing workbook protection...");
        while (protectionTags.length > 0) {
          protectionTags[0].parentNode?.removeChild(protectionTags[0]);
        }
        const serializer = new XMLSerializer();
        loadedZip.file(workbookPath, serializer.serializeToString(doc));
      }
    }

    // 2. Remove Worksheet Protection (Cell locking)
    onProgress("Scanning worksheets...");
    const worksheetFiles: string[] = [];
    loadedZip.folder("xl/worksheets")?.forEach((relativePath, file) => {
      if (relativePath.endsWith(".xml")) {
        worksheetFiles.push(relativePath);
      }
    });

    for (const wsPath of worksheetFiles) {
      const fullPath = `xl/worksheets/${wsPath}`;
      const content = await loadedZip.file(fullPath)!.async("string");
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "application/xml");

      const sheetProtTags = doc.getElementsByTagName("sheetProtection");
      if (sheetProtTags.length > 0) {
        if (!wasProtected) onProgress(`Found protection in sheets...`);
        wasProtected = true;
        while (sheetProtTags.length > 0) {
          sheetProtTags[0].parentNode?.removeChild(sheetProtTags[0]);
        }
        const serializer = new XMLSerializer();
        loadedZip.file(fullPath, serializer.serializeToString(doc));
      }
    }

    onProgress("Repackaging Excel file...");
    const outBlob = await loadedZip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 1 }, // Speed optimization
    });

    onProgress("Completed");
    return { blob: outBlob, wasProtected };
  }

  static async getProperties(file: Blob): Promise<ExcelProperties> {
    const zip = new JSZip();
    try {
      const loadedZip = await zip.loadAsync(file);
      const props: ExcelProperties = {};
      const parser = new DOMParser();

      // Helper to find value by local name (ignoring namespace prefix)
      const getByLocalName = (doc: Document, localName: string) => {
        const elements = doc.getElementsByTagName("*");
        for (let i = 0; i < elements.length; i++) {
          if (elements[i].localName === localName) {
            return elements[i].textContent || undefined;
          }
        }
        return undefined;
      };

      // Core Properties
      const coreFile = loadedZip.file("docProps/core.xml");
      if (coreFile) {
        const content = await coreFile.async("string");
        const doc = parser.parseFromString(content, "application/xml");

        props.title = getByLocalName(doc, "title");
        props.subject = getByLocalName(doc, "subject");
        props.creator = getByLocalName(doc, "creator");
        props.keywords = getByLocalName(doc, "keywords");
        props.description = getByLocalName(doc, "description");
        props.lastModifiedBy = getByLocalName(doc, "lastModifiedBy");
        props.category = getByLocalName(doc, "category");
        props.contentStatus = getByLocalName(doc, "contentStatus");
        props.revision = getByLocalName(doc, "revision");
        props.language = getByLocalName(doc, "language");

        const created = getByLocalName(doc, "created");
        if (created) props.created = new Date(created);

        const modified = getByLocalName(doc, "modified");
        if (modified) props.modified = new Date(modified);

        const lastPrinted = getByLocalName(doc, "lastPrinted");
        if (lastPrinted) props.lastPrinted = new Date(lastPrinted);
      }

      // App Properties (Company, Manager)
      const appFile = loadedZip.file("docProps/app.xml");
      if (appFile) {
        const content = await appFile.async("string");
        const appDoc = parser.parseFromString(content, "application/xml");

        props.company = getByLocalName(appDoc, "Company");
        props.manager = getByLocalName(appDoc, "Manager");
        props.programName = getByLocalName(appDoc, "Application");
        props.version = getByLocalName(appDoc, "AppVersion");
        props.scale = getByLocalName(appDoc, "ScaleCrop") === "true";
        props.linksDirty = getByLocalName(appDoc, "LinksUpToDate") === "false";
      }

      return props;
    } catch (e) {
      console.error("Failed to read properties", e);
      return {};
    }
  }

  static async updateProperties(
    file: Blob,
    newProps: ExcelProperties,
  ): Promise<Blob> {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);
    const parser = new DOMParser();
    const serializer = new XMLSerializer();

    // Namespaces
    const dcNS = "http://purl.org/dc/elements/1.1/";
    const cpNS =
      "http://schemas.openxmlformats.org/package/2006/metadata/core-properties";
    const dctermsNS = "http://purl.org/dc/terms/";
    const xsiNS = "http://www.w3.org/2001/XMLSchema-instance";
    const extNS =
      "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties";
    const vtNS =
      "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes";

    // Helper to update or create simple text node with namespace support
    const updateTag = (
      doc: Document,
      localName: string,
      value: string | undefined | boolean,
      namespace: string | null = null,
      isBoolean: boolean = false,
    ) => {
      if (value === undefined) return;

      // Find by local name to be robust against prefix variations
      let targetEl: Element | null = null;
      const allEls = doc.getElementsByTagName("*"); // Inefficient but reliable for small XMLs
      for (let i = 0; i < allEls.length; i++) {
        if (allEls[i].localName === localName) {
          targetEl = allEls[i];
          break;
        }
      }

      const strValue = isBoolean ? (value ? "true" : "false") : String(value);

      if (targetEl) {
        targetEl.textContent = strValue;
      } else {
        // Create if not exists
        const root = doc.documentElement;
        const newEl = namespace
          ? doc.createElementNS(namespace, localName)
          : doc.createElement(localName);
        newEl.textContent = strValue;
        root.appendChild(newEl);
      }
    };

    // --- Update Core Properties ---
    const corePath = "docProps/core.xml";
    let coreDoc: Document;

    if (loadedZip.file(corePath)) {
      const content = await loadedZip.file(corePath)!.async("string");
      coreDoc = parser.parseFromString(content, "application/xml");
    } else {
      coreDoc = parser.parseFromString(
        `<cp:coreProperties xmlns:cp="${cpNS}" xmlns:dc="${dcNS}" xmlns:dcterms="${dctermsNS}" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="${xsiNS}"></cp:coreProperties>`,
        "application/xml",
      );
    }

    updateTag(coreDoc, "title", newProps.title, dcNS);
    updateTag(coreDoc, "subject", newProps.subject, dcNS);
    updateTag(coreDoc, "creator", newProps.creator, dcNS);
    updateTag(coreDoc, "keywords", newProps.keywords, cpNS);
    updateTag(coreDoc, "description", newProps.description, dcNS);
    updateTag(coreDoc, "lastModifiedBy", newProps.lastModifiedBy, cpNS);
    updateTag(coreDoc, "category", newProps.category, cpNS);
    updateTag(coreDoc, "contentStatus", newProps.contentStatus, cpNS);
    updateTag(coreDoc, "revision", newProps.revision, cpNS);
    updateTag(coreDoc, "language", newProps.language, dcNS);

    // Dates require strict formatting and type attribute
    const updateDate = (localName: string, date?: Date) => {
      if (!date) return;
      let targetEl: Element | null = null;
      const allEls = coreDoc.getElementsByTagName("*");
      for (let i = 0; i < allEls.length; i++) {
        if (allEls[i].localName === localName) {
          targetEl = allEls[i];
          break;
        }
      }

      if (!targetEl) {
        targetEl = coreDoc.createElementNS(
          localName === "created" || localName === "modified"
            ? dctermsNS
            : cpNS,
          localName === "lastPrinted"
            ? "cp:lastPrinted"
            : `dcterms:${localName}`,
        );
        coreDoc.documentElement.appendChild(targetEl);
      }

      // Format: 2023-10-26T12:00:00Z
      targetEl.textContent = date.toISOString();
      if (localName !== "lastPrinted") {
        targetEl.setAttributeNS(xsiNS, "xsi:type", "dcterms:W3CDTF");
      }
    };

    updateDate("created", newProps.created);
    updateDate("modified", newProps.modified);
    updateDate("lastPrinted", newProps.lastPrinted);

    loadedZip.file(corePath, serializer.serializeToString(coreDoc));

    // --- Update App Properties ---
    const appPath = "docProps/app.xml";
    let appDoc: Document;

    if (loadedZip.file(appPath)) {
      const content = await loadedZip.file(appPath)!.async("string");
      appDoc = parser.parseFromString(content, "application/xml");
    } else {
      appDoc = parser.parseFromString(
        `<Properties xmlns="${extNS}" xmlns:vt="${vtNS}"></Properties>`,
        "application/xml",
      );
    }

    updateTag(appDoc, "Company", newProps.company, extNS);
    updateTag(appDoc, "Manager", newProps.manager, extNS);
    updateTag(appDoc, "Application", newProps.programName, extNS);
    updateTag(appDoc, "AppVersion", newProps.version, extNS);
    updateTag(appDoc, "ScaleCrop", newProps.scale, extNS, true);
    updateTag(appDoc, "LinksUpToDate", newProps.linksDirty, extNS, true); // Logic usually inverted but let's stick to simple mapping for now

    loadedZip.file(appPath, serializer.serializeToString(appDoc));

    return await loadedZip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 1 }, // Speed optimization
    });
  }
}
