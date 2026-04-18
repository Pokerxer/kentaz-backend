'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, Download, X, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { api, Product } from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

interface ParsedProduct {
  name: string;
  description?: string;
  category: string;
  price: string;
  cost_price?: string;
  stock?: string;
  size?: string;
  color?: string;
  sku?: string;
  image_url?: string;
  tags?: string;
  status?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

const REQUIRED_FIELDS = ['name', 'category', 'price'];

export default function ImportProductsPage() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [previewMode, setPreviewMode] = useState(true);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files?.[0]) handleFile(files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) handleFile(files[0]);
  };

  const handleFile = async (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      alert('Please select a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    setFile(selectedFile);
    setImportResult(null);
    await parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    setParsing(true);
    try {
      const { products } = await api.products.parseFile(file);
      setParsedProducts(products as unknown as ParsedProduct[]);
    } catch (err) {
      console.error('Parse error:', err);
      alert('Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const validateProducts = useCallback(() => {
    const errors: { row: number; message: string }[] = [];
    const validProducts: ParsedProduct[] = [];

    parsedProducts.forEach((p, idx) => {
      const rowErrors: string[] = [];
      if (!p.name?.trim()) rowErrors.push('Missing name');
      if (!p.category?.trim()) rowErrors.push('Missing category');
      if (!p.price || isNaN(parseFloat(p.price))) rowErrors.push('Invalid/missing price');

      if (rowErrors.length > 0) {
        errors.push({ row: idx + 2, message: rowErrors.join(', ') });
      } else {
        validProducts.push(p);
      }
    });

    return { validProducts, errors };
  }, [parsedProducts]);

  const handleImport = async () => {
    if (parsedProducts.length === 0 || !file) return;
    setImporting(true);
    setPreviewMode(false);
    try {
      const result = await api.products.importFile(file);
      setImportResult(result);
    } catch (err: any) {
      setImportResult({ success: 0, failed: parsedProducts.length, errors: [err.message] });
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedProducts([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const { validProducts, errors } = validateProducts();

  const downloadTemplate = () => {
    const template = `name,description,category,price,cost_price,stock,size,color,sku,image_url,tags,status
"Sample Product","Product description","Electronics",50000,30000,10,"Large","Black","SKU001","https://example.com/image.jpg","electronics;gadgets",published
"Another Product","Another description","Clothing",2500,1500,50,"M","Red","","","clothing",published`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="w-2 h-8 bg-[#C9A84C] rounded-full"></span>
            Import Products
          </h1>
          <p className="text-gray-500 mt-1 ml-5">Bulk import products from a CSV file</p>
        </div>

        {/* File Upload */}
        {!file && (
          <div
            className={`bg-white rounded-2xl border-2 border-dashed p-12 text-center transition-all cursor-pointer ${
              dragActive ? 'border-[#C9A84C] bg-[#C9A84C]/5' : 'border-gray-200 hover:border-[#C9A84C]/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded-2xl bg-[#C9A84C]/10 flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-[#C9A84C]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Drop your file here</h3>
              <p className="text-gray-500 mb-4">or click to browse from your computer</p>
              <p className="text-sm text-gray-400">Supported formats: CSV, XLSX, XLS (max 10MB)</p>
            </div>
          </div>
        )}

        {/* Selected File & Preview */}
        {file && !importResult && (
          <div className="space-y-4">
            {/* File Info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{file.name}</div>
                  <div className="text-sm text-gray-500">{parsedProducts.length} products found</div>
                </div>
              </div>
              <button onClick={handleReset} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Validation Errors */}
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                  <AlertCircle className="h-4 w-4" />
                  {errors.length} row(s) will be skipped due to validation errors
                </div>
                <div className="space-y-1">
                  {errors.slice(0, 5).map((err, idx) => (
                    <div key={idx} className="text-sm text-red-600">Row {err.row}: {err.message}</div>
                  ))}
                  {errors.length > 5 && <div className="text-sm text-red-500">...and {errors.length - 5} more</div>}
                </div>
              </div>
            )}

            {/* Preview Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Preview ({validProducts.length} valid products)</h3>
                {parsing ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Parsing...
                  </div>
                ) : (
                  <button onClick={() => parseFile(file)} className="flex items-center gap-2 text-sm text-[#C9A84C] hover:bg-[#C9A84C]/5 px-3 py-1.5 rounded-lg">
                    <RefreshCw className="h-4 w-4" /> Re-parse
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Price</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Stock</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Size</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Color</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsedProducts.slice(0, 20).map((p, idx) => {
                      const hasError = errors.some(e => e.row === idx + 2);
                      return (
                        <tr key={idx} className={hasError ? 'bg-red-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{p.name || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{p.category || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">₦{parseFloat(p.price || '0').toLocaleString()}</td>
                          <td className="px-4 py-3 text-gray-600">{p.stock || '0'}</td>
                          <td className="px-4 py-3 text-gray-600">{p.size || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{p.color || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {parsedProducts.length > 20 && (
                <div className="p-3 text-center text-sm text-gray-500 bg-gray-50">
                  Showing first 20 of {parsedProducts.length} products
                </div>
              )}
            </div>

            {/* Import Button */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleReset}
                className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || validProducts.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#C9A84C] text-white rounded-xl font-medium hover:bg-[#B8953F] disabled:opacity-50"
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
                ) : (
                  <><FileSpreadsheet className="h-4 w-4" /> Import {validProducts.length} Products</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Import Result */}
        {importResult && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
              {importResult.failed === 0 ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-orange-500" />
              )}
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Import Complete</h3>
                <p className="text-gray-500">
                  {importResult.success} products imported, {importResult.failed} failed
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm text-green-600">Successfully imported</p>
                <p className="text-2xl font-bold text-green-700">{importResult.success}</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4">
                <p className="text-sm text-orange-600">Failed</p>
                <p className="text-2xl font-bold text-orange-700">{importResult.failed}</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-red-50 rounded-xl p-4 mb-6">
                <h4 className="text-sm font-medium text-red-700 mb-2">Errors:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {importResult.errors.map((error, idx) => (
                    <div key={idx} className="text-sm text-red-600">{error}</div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#C9A84C] text-white rounded-xl font-medium hover:bg-[#B8953F]"
            >
              <Upload className="h-4 w-4" /> Import More
            </button>
          </div>
        )}

        {/* Template Info */}
        {!file && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">CSV Template</h3>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 text-[#C9A84C] hover:bg-[#C9A84C]/5 rounded-lg text-sm font-medium"
              >
                <Download className="h-4 w-4" /> Download Template
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Column</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Required</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Description</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr><td className="px-4 py-2 font-medium text-gray-900">name</td><td className="px-4 py-2 text-red-500">Yes</td><td className="px-4 py-2 text-gray-500">Product name</td><td className="px-4 py-2 text-gray-400">T-Shirt</td></tr>
                  <tr><td className="px-4 py-2 font-medium text-gray-900">description</td><td className="px-4 py-2 text-gray-400">No</td><td className="px-4 py-2 text-gray-500">Product description</td><td className="px-4 py-2 text-gray-400">Cotton T-Shirt</td></tr>
                  <tr><td className="px-4 py-2 font-medium text-gray-900">category</td><td className="px-4 py-2 text-red-500">Yes</td><td className="px-4 py-2 text-gray-500">Category name</td><td className="px-4 py-2 text-gray-400">Clothing</td></tr>
                  <tr><td className="px-4 py-2 font-medium text-gray-900">price</td><td className="px-4 py-2 text-red-500">Yes</td><td className="px-4 py-2 text-gray-500">Price in NGN</td><td className="px-4 py-2 text-gray-400">5000</td></tr>
                  <tr><td className="px-4 py-2 font-medium text-gray-900">cost_price</td><td className="px-4 py-2 text-gray-400">No</td><td className="px-4 py-2 text-gray-500">Cost price</td><td className="px-4 py-2 text-gray-400">3000</td></tr>
                  <tr><td className="px-4 py-2 font-medium text-gray-900">stock</td><td className="px-4 py-2 text-gray-400">No</td><td className="px-4 py-2 text-gray-500">Stock quantity</td><td className="px-4 py-2 text-gray-400">100</td></tr>
                  <tr><td className="px-4 py-2 font-medium text-gray-900">size</td><td className="px-4 py-2 text-gray-400">No</td><td className="px-4 py-2 text-gray-500">Size variant</td><td className="px-4 py-2 text-gray-400">L, M, S</td></tr>
                  <tr><td className="px-4 py-2 font-medium text-gray-900">color</td><td className="px-4 py-2 text-gray-400">No</td><td className="px-4 py-2 text-gray-500">Color variant</td><td className="px-4 py-2 text-gray-400">Red, Blue</td></tr>
                  <tr><td className="px-4 py-2 font-medium text-gray-900">sku</td><td className="px-4 py-2 text-gray-400">No</td><td className="px-4 py-2 text-gray-500">SKU number</td><td className="px-4 py-2 text-gray-400">TSHIRT-001</td></tr>
                  <tr><td className="px-4 py-2 font-medium text-gray-900">image_url</td><td className="px-4 py-2 text-gray-400">No</td><td className="px-4 py-2 text-gray-500">Image URL</td><td className="px-4 py-2 text-gray-400">https://...</td></tr>
                  <tr><td className="px-4 py-2 font-medium text-gray-900">tags</td><td className="px-4 py-2 text-gray-400">No</td><td className="px-4 py-2 text-gray-500">Semicolon separated</td><td className="px-4 py-2 text-gray-400">sale;new</td></tr>
                  <tr><td className="px-4 py-2 font-medium text-gray-900">status</td><td className="px-4 py-2 text-gray-400">No</td><td className="px-4 py-2 text-gray-500">draft or published</td><td className="px-4 py-2 text-gray-400">published</td></tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-xl text-sm text-blue-700">
              <strong>Tip:</strong> Products with existing names will be updated. New products will be created. Categories and images are automatically handled.
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}