'use client';

import { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, Download } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';

export default function ImportProductsPage() {
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleImport = () => {
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      setImportResult({
        success: 25,
        failed: 2,
        errors: ['Row 5: Missing required field "price"', 'Row 12: Invalid category']
      });
    }, 2000);
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="w-2 h-8 bg-[#C9A84C] rounded-full"></span>
            Import Products
          </h1>
          <p className="text-gray-500 mt-1 ml-5">Bulk import products from a CSV or Excel file</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 animate-slide-up">
          <div
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
              dragActive 
                ? 'border-[#C9A84C] bg-[#C9A84C]/5' 
                : 'border-gray-200 hover:border-[#C9A84C]/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded-2xl bg-[#C9A84C]/10 flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-[#C9A84C]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Drop your file here
              </h3>
              <p className="text-gray-500 mb-4">
                or click to browse from your computer
              </p>
              <p className="text-sm text-gray-400">
                Supported formats: CSV, XLSX (max 5MB)
              </p>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#C9A84C] text-white rounded-xl font-medium hover:bg-[#B8953F] transition-all disabled:opacity-50"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  Start Import
                </>
              )}
            </button>
          </div>
        </div>

        {importResult && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900">Import Complete</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm text-green-600">Successfully imported</p>
                <p className="text-2xl font-bold text-green-700">{importResult.success} products</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-sm text-red-600">Failed to import</p>
                <p className="text-2xl font-bold text-red-700">{importResult.failed} products</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Errors:</h4>
                <div className="space-y-2">
                  {importResult.errors.map((error, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CSV Template Format</h3>
          <p className="text-gray-500 mb-4">
            Download our template to ensure your data is formatted correctly
          </p>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Column</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Required</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-4 py-2 text-gray-900">name</td>
                  <td className="px-4 py-2 text-red-500">Yes</td>
                  <td className="px-4 py-2 text-gray-500">Product name</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-900">description</td>
                  <td className="px-4 py-2 text-gray-400">No</td>
                  <td className="px-4 py-2 text-gray-500">Product description</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-900">category</td>
                  <td className="px-4 py-2 text-red-500">Yes</td>
                  <td className="px-4 py-2 text-gray-500">Category name</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-900">price</td>
                  <td className="px-4 py-2 text-red-500">Yes</td>
                  <td className="px-4 py-2 text-gray-500">Price in NGN</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-900">stock</td>
                  <td className="px-4 py-2 text-gray-400">No</td>
                  <td className="px-4 py-2 text-gray-500">Stock quantity</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-900">size</td>
                  <td className="px-4 py-2 text-gray-400">No</td>
                  <td className="px-4 py-2 text-gray-500">Size variant</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-900">color</td>
                  <td className="px-4 py-2 text-gray-400">No</td>
                  <td className="px-4 py-2 text-gray-500">Color variant</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-900">image_url</td>
                  <td className="px-4 py-2 text-gray-400">No</td>
                  <td className="px-4 py-2 text-gray-500">Image URL</td>
                </tr>
              </tbody>
            </table>
          </div>

          <button className="mt-4 flex items-center gap-2 px-4 py-2 text-[#C9A84C] hover:bg-[#C9A84C]/5 rounded-lg transition-colors">
            <Download className="h-4 w-4" />
            Download Template
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
