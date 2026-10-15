import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import { Button, Card, Badge } from '../../components/ui/index.js';
import {
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import { CsvImportResult } from '@digicatlog/shared';

export const BulkCsvPage: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);

  const handleExport = () => {
    window.open('/api/dashboard/csv/export', '_blank');
    toast.success('Downloading menu CSV export...');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Please upload a valid .csv file.');
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await api.post<CsvImportResult>(
        '/dashboard/csv/import',
        formData
      );

      setImportResult(res);
      queryClient.invalidateQueries({ queryKey: ['shop-items'] });
      queryClient.invalidateQueries({ queryKey: ['shop-categories'] });

      if (res.failureCount === 0) {
        toast.success(`All ${res.successCount} items imported cleanly!`);
      } else {
        toast.info(
          `Imported ${res.successCount} items with ${res.failureCount} error(s). Review report below.`
        );
      }
    } catch (err: any) {
      if (err.data?.errors) {
        setImportResult(err.data);
      }
      toast.error(err.message || 'CSV Import failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadSampleTemplate = () => {
    const sample = [
      'category,name,description,price,isVeg,spiceLevel,tags,isAvailable',
      'Starters,Truffle Fries,Crispy hand-cut fries with white truffle oil and parmigiano,8.50,true,0,"Chef Choice, Truffle",true',
      'Starters,Crispy Chicken Wings,Glazed in spicy sweet chili sauce,12.00,false,2,"Spicy, Wings",true',
      'Pasta,Wild Mushroom Risotto,Arborio rice with porcini and cultured butter,19.00,true,0,Vegetarian,true',
      'Desserts,Tiramisu,Savoiardi espresso soaked with mascarpone cream,9.50,true,0,"Must Try",true',
    ].join('\n');

    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'digicatlog-sample-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-cream-950">
            Bulk CSV Import & Export
          </h1>
          <p className="text-sm text-cream-600 mt-1">
            Quickly migrate dishes, bulk update prices, or export backups of your catalog
          </p>
        </div>
        <Button
          variant="outline"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={handleExport}
        >
          Export Menu to CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Upload Card */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-cream-950 uppercase tracking-wider mb-2">
              Import Items from CSV
            </h2>
            <p className="text-xs text-cream-600 mb-6">
              New categories mentioned in your CSV will be automatically created.
            </p>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <label className="border-2 border-dashed border-surface-border hover:border-brand-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-cream-50/50">
                <FileSpreadsheet className="w-10 h-10 text-brand-600 mb-3" />
                <span className="text-sm font-semibold text-cream-900 block">
                  {selectedFile ? selectedFile.name : 'Choose a .csv file or drag here'}
                </span>
                <span className="text-xs text-cream-500 mt-1">
                  Supports UTF-8 comma-separated files
                </span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="text-xs text-brand-600 hover:text-brand-700 font-semibold underline"
                >
                  Download Sample CSV Template
                </button>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={!selectedFile || isUploading}
                  isLoading={isUploading}
                  leftIcon={<Upload className="w-4 h-4" />}
                >
                  Upload & Import
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right: Format Specs */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-cream-950 uppercase tracking-wider mb-3">
              Expected CSV Column Headers
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-surface-border text-cream-700 font-semibold">
                    <th className="py-2 pr-3">Column</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2">Example / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-cream-800 font-mono">
                  <tr>
                    <td className="py-2 pr-3 font-semibold text-brand-700">category</td>
                    <td className="py-2 pr-3">Text</td>
                    <td className="py-2 font-sans">Starters, Mains (auto-created)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-semibold text-brand-700">name</td>
                    <td className="py-2 pr-3">Text</td>
                    <td className="py-2 font-sans">Item / dish name (required)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-semibold text-brand-700">description</td>
                    <td className="py-2 pr-3">Text</td>
                    <td className="py-2 font-sans">Optional ingredients description</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-semibold text-brand-700">price</td>
                    <td className="py-2 pr-3">Number</td>
                    <td className="py-2 font-sans">e.g. 14.50 (must be ≥ 0)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-semibold text-brand-700">isVeg</td>
                    <td className="py-2 pr-3">Boolean</td>
                    <td className="py-2 font-sans">true / false / yes / no</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-semibold text-brand-700">spiceLevel</td>
                    <td className="py-2 pr-3">0 - 3</td>
                    <td className="py-2 font-sans">0 (none) to 3 (very spicy)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-semibold text-brand-700">tags</td>
                    <td className="py-2 pr-3">Text</td>
                    <td className="py-2 font-sans">Comma-separated: "Chef, Truffle"</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-semibold text-brand-700">isAvailable</td>
                    <td className="py-2 pr-3">Boolean</td>
                    <td className="py-2 font-sans">true (in-stock) / false (sold-out)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Row-Level Validation Report */}
      {importResult && (
        <Card className="p-6 space-y-4 shadow-warm">
          <div className="flex items-center justify-between pb-3 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-brand-600" />
              <h2 className="text-base font-semibold text-cream-950">
                Import Summary Report
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="success">
                {importResult.successCount} Successful
              </Badge>
              {importResult.failureCount > 0 && (
                <Badge variant="danger">
                  {importResult.failureCount} Failed
                </Badge>
              )}
            </div>
          </div>

          {importResult.errors && importResult.errors.length > 0 ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>
                  The following {importResult.errors.length} row(s) had validation errors and were skipped:
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-border text-cream-600 uppercase tracking-wider text-[11px] bg-cream-50/50">
                      <th className="py-2.5 px-4">Row #</th>
                      <th className="py-2.5 px-4">Field</th>
                      <th className="py-2.5 px-4">Error Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-cream-900">
                    {importResult.errors.map((err, i) => (
                      <tr key={i} className="hover:bg-cream-50/40">
                        <td className="py-2.5 px-4 font-mono font-bold text-cream-800">
                          Row {err.row}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-red-700 font-semibold">
                          {err.field}
                        </td>
                        <td className="py-2.5 px-4 text-cream-700">
                          {err.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                Clean import! All rows complied with catalog specifications and have been added to your menu.
              </span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
