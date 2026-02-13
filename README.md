# Excel Unprotect

A secure, client-side tool designed to instantly remove password protection from Excel (.xlsx) spreadsheets. This application processes files entirely within your web browser, ensuring your sensitive data never leaves your device.

## 🚀 Features

- **Instant Protection Removal**: Quickly strips Sheet Protection and Workbook Structure Protection from standard .xlsx files.
- **100% Client-Side Privacy**: Leveraging browser capabilities, no files are ever uploaded to a server. Your data remains private and secure.
- **Modern & Responsive UI**: Built with React and Tailwind CSS for a clean, user-friendly experience on any device.
- **Legacy File Detection**: Alerts users when older .xls files are uploaded and provides instructions for conversion to the supported .xlsx format.

## 🛠️ How it Works

Modern Excel files (.xlsx) are essentially zipped archives containing XML configuration files. **Excel Unprotect** works by:

1. **Unzipping**: Using `JSZip` to open the .xlsx document structure in memory.
2. **Sanitizing**: identifying and modifying the specific XML nodes responsible for enforcing sheet and workbook protection.
3. **Repackaging**: Re-assembling the modified components into a new, valid .xlsx file.
4. **Downloading**: Automatically triggering a download of the unprotected file via `file-saver`.

## 💻 Tech Stack

- **[React](https://react.dev/)**: Frontend library for building the user interface.
- **[Vite](https://vitejs.dev/)**: Next-generation frontend tooling for fast development and building.
- **[Tailwind CSS](https://tailwindcss.com/)**: Utility-first CSS framework for rapid UI styling.
- **[JSZip](https://stuk.github.io/jszip/)**: A library for creating, reading, and editing .zip files (and by extension, .xlsx files).
- **[Lucide React](https://lucide.dev/)**: Beautiful, consistent icons.

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

4. Open your browser and navigate to `http://localhost:5173` (or the URL shown in your terminal).

## 📝 License

This project is open-source.
