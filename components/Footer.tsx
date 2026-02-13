import React from "react";
import { Icons } from "./Icons";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Social Links */}
          <div className="flex space-x-6">
            <a
              href="https://github.com/abazbazrira"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="GitHub"
            >
              <Icons.Github className="w-6 h-6" />
            </a>
            <a
              href="https://www.linkedin.com/in/bazrira-noerfirdiansyah/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-blue-600 transition-colors"
              aria-label="LinkedIn"
            >
              <Icons.Linkedin className="w-6 h-6" />
            </a>
            <a
              href="https://instagram.com/abaz.bazrira"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-pink-600 transition-colors"
              aria-label="Instagram"
            >
              <Icons.Instagram className="w-6 h-6" />
            </a>
          </div>

          {/* Copyright */}
          <div className="text-center">
            <p className="text-slate-600 font-medium">
              Built with <span className="text-red-500">❤️</span> by{" "}
              <a
                href="https://github.com/abazbazrira"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:text-brand-700 hover:underline"
              >
                abazbazrira
              </a>{" "}
              © {currentYear}
            </p>
          </div>

          {/* Disclaimer */}
          <div className="text-center max-w-2xl px-4">
            <p className="text-xs text-slate-400">
              Disclaimer: Files are processed locally in your browser and are
              never uploaded to any server. Your data remains completely private
              and secure.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
