import JSZip from 'jszip';

export class ExcelService {
  /**
   * Unprotects an Excel file (.xlsx).
   * Removes XML protection tags directly (preserves exact file structure).
   */
  static async unprotectFile(
    file: File, 
    onProgress: (step: string) => void
  ): Promise<{ blob: Blob; wasProtected: boolean }> {
    
    // 0. Validate Extension
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
        throw new Error("Only .xlsx files are supported. Please convert .xls files to .xlsx in Excel first.");
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
        if (magic1 === 0xD0CF11E0 && magic2 === 0xA1B11AE1) {
            throw new Error("This file is encrypted with a 'Password to Open'. This tool cannot bypass opening passwords, only sheet/workbook protection.");
        }
      }
    } catch (e: any) {
      if (e.message && e.message.includes("Password to Open")) throw e;
    }

    try {
       return await this.processModernFile(file, onProgress);
    } catch (error: any) {
      console.error("Excel processing error:", error);
      if (error.message && (error.message.includes("Password to Open") || error.message.includes("Password"))) {
        throw error;
      }
      throw new Error(error.message || "Failed to process the Excel file. It might be corrupted or in an unsupported format.");
    }
  }

  private static async processModernFile(file: File, onProgress: (step: string) => void): Promise<{ blob: Blob; wasProtected: boolean }> {
    onProgress("Reading file structure...");
    const zip = new JSZip();
    let wasProtected = false;
    
    let loadedZip;
    try {
        loadedZip = await zip.loadAsync(file);
    } catch(e) {
        throw new Error("Could not read .xlsx file structure. The file might be corrupted or encrypted.");
    }

    onProgress("Analyzing workbook...");
    
    // 1. Remove Workbook Protection (Structure)
    const workbookPath = 'xl/workbook.xml';
    if (loadedZip.file(workbookPath)) {
      const content = await loadedZip.file(workbookPath)!.async('string');
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'application/xml');
      
      const protectionTags = doc.getElementsByTagName('workbookProtection');
      if (protectionTags.length > 0) {
        wasProtected = true;
        onProgress("Removing workbook protection...");
        while(protectionTags.length > 0) {
          protectionTags[0].parentNode?.removeChild(protectionTags[0]);
        }
        const serializer = new XMLSerializer();
        loadedZip.file(workbookPath, serializer.serializeToString(doc));
      }
    }

    // 2. Remove Worksheet Protection (Cell locking)
    onProgress("Scanning worksheets...");
    const worksheetFiles: string[] = [];
    loadedZip.folder('xl/worksheets')?.forEach((relativePath, file) => {
      if (relativePath.endsWith('.xml')) {
          worksheetFiles.push(relativePath);
      }
    });

    for (const wsPath of worksheetFiles) {
      const fullPath = `xl/worksheets/${wsPath}`;
      const content = await loadedZip.file(fullPath)!.async('string');
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'application/xml');
      
      const sheetProtTags = doc.getElementsByTagName('sheetProtection');
      if (sheetProtTags.length > 0) {
        if (!wasProtected) onProgress(`Found protection in sheets...`);
        wasProtected = true;
        while(sheetProtTags.length > 0) {
          sheetProtTags[0].parentNode?.removeChild(sheetProtTags[0]);
        }
        const serializer = new XMLSerializer();
        loadedZip.file(fullPath, serializer.serializeToString(doc));
      }
    }

    onProgress("Repackaging Excel file...");
    const outBlob = await loadedZip.generateAsync({ type: 'blob' });
    
    onProgress("Completed");
    return { blob: outBlob, wasProtected };
  }
}