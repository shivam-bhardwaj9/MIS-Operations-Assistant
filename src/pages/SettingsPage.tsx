import React, { useState } from 'react';
import { Check, RefreshCw, Save, Trash2 } from 'lucide-react';
import { AppSettings } from '../types/mis';
import { DEFAULT_SETTINGS } from '../utils/formatters';

interface SettingsPageProps {
  settings: AppSettings;
  onUpdateSettings: (next: Partial<AppSettings>) => void;
  onClearSession: () => void;
}

export function SettingsPage({
  settings,
  onUpdateSettings,
  onClearSession,
}: SettingsPageProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(draft);
  };

  const handleResetDefaults = () => {
    setDraft(DEFAULT_SETTINGS);
    onUpdateSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Operational Preferences & MIS Rule Configuration
        </h2>
        <p className="text-sm text-slate-600">
          Configure currency display, Excel export metadata, and deterministic validation behavior.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Organization / Division Name (Excel Report Header)
            </label>
            <input
              type="text"
              value={draft.organizationName}
              onChange={(e) => setDraft({ ...draft, organizationName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Prepared By (Operator / MIS Intern Name)
            </label>
            <input
              type="text"
              value={draft.preparedBy}
              onChange={(e) => setDraft({ ...draft, preparedBy: e.target.value })}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Currency Symbol & Number Grouping
            </label>
            <select
              value={draft.currencySymbol}
              onChange={(e) => {
                const sym = e.target.value as '₹' | '$';
                setDraft({
                  ...draft,
                  currencySymbol: sym,
                  numberFormat: sym === '₹' ? 'en-IN' : 'en-US',
                });
              }}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="₹">₹ INR — Indian Numbering System (₹18,45,000)</option>
              <option value="$">$ USD — Standard Grouping ($1,845,000)</option>
            </select>
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.strictDateValidation}
                onChange={(e) =>
                  setDraft({ ...draft, strictDateValidation: e.target.checked })
                }
                className="rounded border-slate-300 text-slate-900"
              />
              <span>Enforce strict DD-MM-YYYY date calendar bounds validation</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.autoTrimWhitespace}
                onChange={(e) =>
                  setDraft({ ...draft, autoTrimWhitespace: e.target.checked })
                }
                className="rounded border-slate-300 text-slate-900"
              />
              <span>Trim leading/trailing whitespace during deterministic cleaning</span>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>

      {/* Deterministic Validation Rule Specification Reference */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          Deterministic Validation & Cleaning Specification
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Allowed Enumeration Values</span>
            </div>
            <div>
              <strong>Type:</strong> Credit, Debit
            </div>
            <div>
              <strong>Mode:</strong> Cash, UPI, Bank
            </div>
            <div>
              <strong>Status:</strong> Success, Pending, Failed
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Status Check & Review Assignment</span>
            </div>
            <div>
              <strong>Success (with zero validation errors):</strong> OK
            </div>
            <div>
              <strong>Pending or Failed:</strong> Review Needed
            </div>
            <div>
              <strong>Missing / Duplicate / Invalid Fields:</strong> Review Needed
            </div>
          </div>
        </div>
      </div>

      {/* Session Reset */}
      <div className="bg-white border border-rose-200 rounded-xl p-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Clear In-Memory Session</h3>
          <p className="text-xs text-slate-500">
            Removes currently uploaded workbooks and reconciliation datasets from memory.
          </p>
        </div>

        <button
          type="button"
          onClick={onClearSession}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-50 border border-rose-300 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition-colors whitespace-nowrap"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Session Data</span>
        </button>
      </div>
    </div>
  );
}
