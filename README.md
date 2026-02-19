# Excel Unprotect & Properties Editor

A secure, client-side tool designed to instantly remove password protection from Excel spreadsheets and edit file metadata. This application processes files entirely within your web browser, ensuring your sensitive data never leaves your device.

## 🚀 Features

- **Instant Protection Removal**: Quickly strips Sheet Protection and Workbook Structure Protection from standard `.xlsx` files.
- **Edit File Properties**: View and modify detailed metadata (Title, Author, Company, etc.) for both modern `.xlsx` and legacy `.xls` files.
- **Legacy File Support**:
  - **Unprotect**: Detects `.xls` files and guides users to convert them.
  - **Properties Editor**: Full read/write support for legacy `.xls` metadata.
- **Drag & Drop Support**: Easily upload files by dragging them into the drop zone.
- **100% Client-Side Privacy**: Leveraging browser capabilities, no files are ever uploaded to a server. Your data remains private and secure.
- **Modern & Responsive UI**: Built with React and Tailwind CSS for a clean, user-friendly experience on any device.

## 🛠️ How it Works

### Unprotect Feature

Modern Excel files (`.xlsx`) are essentially zipped archives containing XML configuration files. **Excel Unprotect** works by:

1. **Unzipping**: Using `JSZip` to open the document structure in memory.
2. **Sanitizing**: Identifying and removing XML nodes responsible for protection.
3. **Repackaging**: Re-assembling into a valid, unprotected `.xlsx` file.

### Properties Editor

The editor allows modification of extended file metadata:

- **.xlsx Files**: Modifies `docProps/core.xml` and `docProps/app.xml` inside the zip structure.
- **.xls Files**: Uses `SheetJS` (`xlsx` library) to parse and update binary BIFF8 metadata.

## 💻 Tech Stack

- **[React](https://react.dev/)**: Frontend library.
- **[Vite](https://vitejs.dev/)**: Fast build tool.
- **[Tailwind CSS](https://tailwindcss.com/)**: Utility-first CSS framework.
- **[JSZip](https://stuk.github.io/jszip/)**: For handling `.xlsx` zip structures.
- **[SheetJS / xlsx](https://sheetjs.com/)**: For handling legacy `.xls` file operations.
- **[Lucide React](https://lucide.dev/)**: Beautiful icons.

## 📦 Getting Started

### Prerequisites

- **Node.js** (version 18+ recommended)
- **npm** or **yarn**

### Installation

1. Clone the repository:

   ```bash
   git clone <your-repo-url>
   cd excel-unprotect
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open your browser and navigate to the URL shown in your terminal (usually `http://localhost:5173`).

## 📝 License

This project is open-source.
