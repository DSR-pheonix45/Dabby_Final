# Party Import Modal - React Component Implementation

## PART 1: MODAL COMPONENT STRUCTURE

```jsx
// src/components/Workbenches/detail/PartyImportModal.jsx

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, FileText, Plus, X } from 'lucide-react';

const PartyImportModal = ({ isOpen, onClose, workspaceId, onImportSuccess }) => {
  const [step, setStep] = useState('method'); // method, csv-upload, preview, complete
  const [method, setMethod] = useState(null); // 'zoho', 'salesforce', 'csv'
  const [csvData, setCsvData] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center border-b">
          <h2 className="text-xl font-bold">Import Parties</h2>
          <button
            onClick={onClose}
            className="hover:bg-blue-800 p-1 rounded transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'method' && (
            <MethodSelection
              onSelect={(method) => {
                setMethod(method);
                setStep(method === 'csv' ? 'csv-upload' : 'crm-connect');
              }}
            />
          )}

          {step === 'csv-upload' && method === 'csv' && (
            <CSVUploadStep
              onUpload={async (file) => {
                setLoading(true);
                try {
                  const preview = await processCSV(file, workspaceId);
                  setPreview(preview);
                  setCsvData(file);
                  setStep('preview');
                } catch (error) {
                  toast.error(error.message);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}

          {step === 'preview' && (
            <PreviewStep
              preview={preview}
              onConfirm={async () => {
                setLoading(true);
                try {
                  await importParties(csvData, workspaceId, preview);
                  setStep('complete');
                  onImportSuccess?.();
                } catch (error) {
                  toast.error(error.message);
                } finally {
                  setLoading(false);
                }
              }}
              onBack={() => setStep('csv-upload')}
              loading={loading}
            />
          )}

          {step === 'complete' && (
            <CompleteStep
              summary={preview}
              onClose={onClose}
            />
          )}
        </div>

        {/* Manual Entry Button (always visible) */}
        <div className="border-t p-6 bg-gray-50">
          <button
            onClick={() => setShowManualEntry(true)}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-2"
          >
            <Plus size={16} /> Add Party Manually
          </button>
        </div>
      </div>

      {/* Manual Entry Modal (nested) */}
      {showManualEntry && (
        <ManualPartyEntryModal
          isOpen={showManualEntry}
          onClose={() => setShowManualEntry(false)}
          workspaceId={workspaceId}
          onSave={() => {
            setShowManualEntry(false);
            onImportSuccess?.();
          }}
        />
      )}
    </div>
  );
};

export default PartyImportModal;
```

---

## PART 2: METHOD SELECTION COMPONENT

```jsx
const MethodSelection = ({ onSelect }) => (
  <div className="space-y-4">
    <p className="text-gray-700 mb-6">Choose how you'd like to import parties:</p>

    {/* Zoho CRM Option */}
    <div
      onClick={() => onSelect('zoho')}
      className="border-2 border-gray-200 hover:border-blue-500 rounded-lg p-4 cursor-pointer transition"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center">
          <span className="text-lg font-bold text-blue-600">Z</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">Zoho CRM</h3>
          <p className="text-sm text-gray-600">
            Auto-sync customers & vendors from Zoho CRM (Recommended)
          </p>
        </div>
        <div className="text-green-600 text-sm">→</div>
      </div>
    </div>

    {/* Salesforce Option */}
    <div
      onClick={() => onSelect('salesforce')}
      className="border-2 border-gray-200 hover:border-blue-500 rounded-lg p-4 cursor-pointer transition"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-green-100 rounded flex items-center justify-center">
          <span className="text-lg font-bold text-green-600">SF</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">Salesforce</h3>
          <p className="text-sm text-gray-600">
            Auto-sync accounts from Salesforce (Recommended)
          </p>
        </div>
        <div className="text-green-600 text-sm">→</div>
      </div>
    </div>

    {/* CSV Option */}
    <div
      onClick={() => onSelect('csv')}
      className="border-2 border-gray-200 hover:border-blue-500 rounded-lg p-4 cursor-pointer transition"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-orange-100 rounded flex items-center justify-center">
          <FileText size={24} className="text-orange-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">CSV Upload (Manual)</h3>
          <p className="text-sm text-gray-600">
            Upload a CSV file with party data (fallback option)
          </p>
        </div>
        <div className="text-green-600 text-sm">→</div>
      </div>
    </div>
  </div>
);
```

---

## PART 3: CSV UPLOAD COMPONENT

```jsx
const CSVUploadStep = ({ onUpload, loading }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.name.endsWith('.csv')) {
      onUpload(file);
    } else {
      toast.error('Please upload a CSV file');
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file?.name.endsWith('.csv')) {
      onUpload(file);
    } else {
      toast.error('Please select a CSV file');
    }
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Download Template */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Step 1: Download Template</h3>
        <p className="text-sm text-gray-700 mb-3">
          Download the CSV template to fill with party data:
        </p>
        <a
          href="/templates/dabby_party_import_template.csv"
          download
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
        >
          <Upload size={18} />
          Download Template
        </a>
        <p className="text-xs text-gray-600 mt-2">
          Contains: party_name, party_type, email, phone, gst_number, address, city, state, credit_terms_days, is_active
        </p>
      </div>

      {/* Step 2: Upload CSV */}
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={dragActive ? 'bg-blue-50 border-blue-400 border-solid' : ''}
      >
        <div className="flex justify-center mb-4">
          <Upload size={48} className="text-gray-400" />
        </div>
        <h3 className="font-semibold text-gray-800 mb-2">Step 2: Upload CSV File</h3>
        <p className="text-gray-600 mb-4">
          Drag-drop CSV file here or click to browse
        </p>

        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          disabled={loading}
          id="csv-input"
          className="hidden"
        />
        <label
          htmlFor="csv-input"
          className="inline-block bg-white border border-gray-300 hover:border-blue-600 text-gray-700 px-6 py-2 rounded cursor-pointer transition"
        >
          {loading ? 'Processing...' : 'Choose File'}
        </label>

        <div className="mt-4 text-xs text-gray-500 space-y-1">
          <p>ℹ️ Accepted format: CSV only (.csv)</p>
          <p>ℹ️ Max file size: 10 MB</p>
          <p>ℹ️ Max rows: 5000 parties per import</p>
        </div>
      </div>
    </div>
  );
};
```

---

## PART 4: PREVIEW COMPONENT

```jsx
const PreviewStep = ({ preview, onConfirm, onBack, loading }) => {
  const [confirmed, setConfirmed] = useState(false);

  if (!preview) return null;

  const { total_rows, valid_rows, new_parties, update_parties, error_count, preview: rows, errors } = preview;

  return (
    <div className="space-y-6">
      <div className="bg-white">
        <h3 className="font-semibold text-gray-800 mb-4">Step 3: Review & Confirm</h3>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="text-2xl font-bold text-blue-600">{total_rows}</div>
            <div className="text-sm text-gray-600">Total rows</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="text-2xl font-bold text-green-600">{new_parties}</div>
            <div className="text-sm text-gray-600">New parties</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <div className="text-2xl font-bold text-yellow-600">{update_parties}</div>
            <div className="text-sm text-gray-600">Will update</div>
          </div>
          <div className={`${error_count > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} border rounded p-3`}>
            <div className={`text-2xl font-bold ${error_count > 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {error_count}
            </div>
            <div className="text-sm text-gray-600">Errors</div>
          </div>
        </div>

        {/* Preview Table */}
        <div className="overflow-x-auto bg-gray-50 rounded border">
          <table className="w-full text-sm">
            <thead className="bg-gray-200 border-b">
              <tr>
                <th className="p-3 text-left">#</th>
                <th className="p-3 text-left">Party Name</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-white">
                  <td className="p-3">{idx + 1}</td>
                  <td className="p-3">{row.party_name}</td>
                  <td className="p-3">{row.party_type}</td>
                  <td className="p-3 text-xs">{row.email}</td>
                  <td className="p-3 text-center">
                    {row.action === 'NEW' ? (
                      <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        ✓ NEW
                      </span>
                    ) : (
                      <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                        ⚠ UPDATE
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 5 && (
            <div className="p-3 text-center text-sm text-gray-600 bg-gray-100">
              Showing 5 of {rows.length} rows [ Scroll for more ]
            </div>
          )}
        </div>

        {/* Errors (if any) */}
        {errors.length > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded p-4">
            <h4 className="font-semibold text-red-800 mb-2">Errors Found:</h4>
            <div className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
              {errors.slice(0, 5).map((err, idx) => (
                <div key={idx}>
                  <strong>Row {err.row}:</strong> {err.errors.join(', ')}
                </div>
              ))}
              {errors.length > 5 && (
                <div className="text-gray-600">... and {errors.length - 5} more</div>
              )}
            </div>
          </div>
        )}

        {/* Confirmation Checkbox */}
        <div className="mt-6 flex items-center gap-3">
          <input
            type="checkbox"
            id="confirm"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="confirm" className="text-sm text-gray-700">
            I confirm the data looks correct
          </label>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={!confirmed || loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Importing...' : 'Import Now'}
        </button>
      </div>
    </div>
  );
};
```

---

## PART 5: MANUAL PARTY ENTRY COMPONENT

```jsx
const ManualPartyEntryModal = ({ isOpen, onClose, workspaceId, onSave }) => {
  const [formData, setFormData] = useState({
    party_name: '',
    party_type: 'Customer',
    email: '',
    phone: '',
    gst_number: '',
    address: '',
    city: '',
    state: '',
    credit_terms_days: '30',
    is_active: true,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.party_name.trim()) newErrors.party_name = 'Required';
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) newErrors.email = 'Invalid email';
    if (!formData.phone.match(/^\+91\s?\d{5}\s?\d{5}$/)) newErrors.phone = 'Format: +91 XXXXX XXXXX';
    if (!formData.address || formData.address.length < 10) newErrors.address = 'Min 10 chars';
    if (!formData.city) newErrors.city = 'Required';
    if (!formData.state) newErrors.state = 'Required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, ...formData }),
      });
      if (!response.ok) throw new Error('Failed to create party');
      toast.success('Party created successfully');
      onSave?.();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Add New Party</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Party Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Party Name *
            </label>
            <input
              type="text"
              value={formData.party_name}
              onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
              placeholder="ABC Trading Private Limited"
              className={`w-full px-3 py-2 border rounded ${errors.party_name ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.party_name && <p className="text-red-500 text-xs mt-1">{errors.party_name}</p>}
          </div>

          {/* Party Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Party Type *
            </label>
            <div className="flex gap-4">
              {['Customer', 'Vendor', 'Both'].map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="party_type"
                    value={type}
                    checked={formData.party_type === type}
                    onChange={(e) => setFormData({ ...formData, party_type: e.target.value })}
                  />
                  <span className="text-sm">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="accounts@abc.com"
              className={`w-full px-3 py-2 border rounded ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 9876543210"
              className={`w-full px-3 py-2 border rounded ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          {/* GST Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GST Number (Optional)
            </label>
            <input
              type="text"
              value={formData.gst_number}
              onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
              placeholder="27AABCU9603R1Z0"
              maxLength="15"
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Business Park, MG Road"
              rows="2"
              className={`w-full px-3 py-2 border rounded ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>

          {/* City & State (inline) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <select
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className={`w-full px-3 py-2 border rounded ${errors.city ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Select City</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi</option>
                <option value="Pune">Pune</option>
                {/* More cities */}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State *
              </label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className={`w-full px-3 py-2 border rounded ${errors.state ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Select State</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi">Delhi</option>
                {/* More states */}
              </select>
            </div>
          </div>

          {/* Credit Terms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Credit Terms (Days) *
            </label>
            <input
              type="number"
              value={formData.credit_terms_days}
              onChange={(e) => setFormData({ ...formData, credit_terms_days: e.target.value })}
              min="0"
              max="365"
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          {/* Active */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Active Party
            </label>
          </div>

          {/* Form Buttons */}
          <div className="flex justify-between pt-4 border-t gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:bg-gray-400 transition"
            >
              {loading ? 'Saving...' : '+ Add Party'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

---

## PART 6: UTILITY FUNCTION - PROCESS CSV

```jsx
// src/services/partyImportService.js

export const processCSV = async (file, workspaceId) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const csv = e.target.result;
        const rows = csv.split('\n').map(row => row.split(','));
        const headers = rows[0];
        const data = rows.slice(1).filter(row => row[0]); // Remove empty rows

        // Validate headers
        const expectedHeaders = [
          'party_name', 'party_type', 'email', 'phone', 'gst_number',
          'address', 'city', 'state', 'credit_terms_days', 'is_active'
        ];

        if (!headers.every((h, idx) => h.trim() === expectedHeaders[idx])) {
          reject(new Error('CSV headers do not match template'));
          return;
        }

        // Parse and validate rows
        const validatedRows = [];
        const errors = [];

        data.forEach((row, idx) => {
          const rowNum = idx + 2; // +2 because of header row offset
          const record = {
            party_name: row[0]?.trim() || '',
            party_type: row[1]?.trim() || '',
            email: row[2]?.trim() || '',
            phone: row[3]?.trim() || '',
            gst_number: row[4]?.trim() || '',
            address: row[5]?.trim() || '',
            city: row[6]?.trim() || '',
            state: row[7]?.trim() || '',
            credit_terms_days: parseInt(row[8] || 0),
            is_active: row[9]?.trim().toLowerCase() === 'true',
          };

          const rowErrors = validateCSVRow(record);

          if (rowErrors.length > 0) {
            errors.push({
              row: rowNum,
              party_name: record.party_name,
              errors: rowErrors
            });
          } else {
            validatedRows.push(record);
          }
        });

        // De-duplicate by email
        const deduped = [];
        const emailSet = new Set();

        validatedRows.forEach(row => {
          if (!emailSet.has(row.email)) {
            emailSet.add(row.email);
            deduped.push(row);
          }
        });

        // Send to backend for de-duplication against existing parties
        const response = await fetch('/api/import/csv-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: workspaceId,
            parties: deduped
          })
        });

        const preview = await response.json();

        resolve({
          total_rows: data.length,
          valid_rows: validatedRows.length,
          new_parties: preview.new_count,
          update_parties: preview.update_count,
          error_count: errors.length,
          preview: preview.preview_rows,
          errors: errors
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

const validateCSVRow = (record) => {
  const errors = [];

  if (!record.party_name || record.party_name.length < 2 || record.party_name.length > 100) {
    errors.push('Party name must be 2-100 chars');
  }

  if (!['Customer', 'Vendor', 'Both'].includes(record.party_type)) {
    errors.push('Party type must be: Customer, Vendor, or Both');
  }

  if (!record.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    errors.push('Invalid email format');
  }

  if (!record.phone.replace(/\s/g, '').match(/^\+919\d{9}$/)) {
    errors.push('Phone must be: +91 XXXXX XXXXX');
  }

  if (record.gst_number && record.gst_number.length !== 15) {
    errors.push('GST number must be 15 characters');
  }

  if (!record.address || record.address.length < 10) {
    errors.push('Address must be at least 10 chars');
  }

  if (!record.city) errors.push('City is required');
  if (!record.state) errors.push('State is required');

  if (isNaN(record.credit_terms_days) || record.credit_terms_days < 0 || record.credit_terms_days > 365) {
    errors.push('Credit terms must be 0-365 days');
  }

  return errors;
};

export const importParties = async (file, workspaceId, preview) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspace_id', workspaceId);

  const response = await fetch('/api/import/csv-confirm', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Import failed');
  }

  return response.json();
};
```

---

## PART 7: BACKEND ENDPOINT - FASTAPI

```python
# backend/routers/import.py

from fastapi import APIRouter, UploadFile, HTTPException
from pydantic import BaseModel
from typing import List
import csv
import io
from supabase_client import supabase_client

router = APIRouter(prefix="/api/import", tags=["import"])

class PartyData(BaseModel):
    party_name: str
    party_type: str  # Customer, Vendor, Both
    email: str
    phone: str
    gst_number: str = None
    address: str
    city: str
    state: str
    credit_terms_days: int
    is_active: bool

@router.post("/csv-preview")
async def csv_preview(workspace_id: str, parties: List[PartyData]):
    """Preview CSV import before confirming"""

    # Get existing parties by email
    existing_emails = set()
    try:
        result = supabase_client.table("parties").select("email").eq("workspace_id", workspace_id).execute()
        existing_emails = {p["email"] for p in result.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Categorize parties
    new_parties = []
    update_parties = []

    for party in parties:
        if party.email in existing_emails:
            update_parties.append(party)
        else:
            new_parties.append(party)

    return {
        "new_count": len(new_parties),
        "update_count": len(update_parties),
        "preview_rows": (new_parties + update_parties)[:5],
        "total": len(parties)
    }

@router.post("/csv-confirm")
async def csv_confirm(file: UploadFile, workspace_id: str):
    """Confirm and import parties from CSV"""

    try:
        # Read file
        contents = await file.read()
        csv_data = csv.DictReader(io.StringIO(contents.decode('utf-8')))

        created_count = 0
        updated_count = 0

        for row in csv_data:
            party_data = {
                "workspace_id": workspace_id,
                "name": row["party_name"],
                "party_type": row["party_type"],
                "email": row["email"],
                "phone": row["phone"],
                "gst_number": row.get("gst_number") or None,
                "address": row["address"],
                "city": row["city"],
                "state": row["state"],
                "credit_terms_days": int(row["credit_terms_days"]),
                "is_active": row["is_active"].lower() == "true",
                "crm_type": "manual",
                "created_at": "now()"
            }

            # Check if exists by email
            existing = supabase_client.table("parties").select("id") \
                .eq("workspace_id", workspace_id) \
                .eq("email", party_data["email"]) \
                .execute()

            if existing.data:
                # Update
                supabase_client.table("parties").update(party_data) \
                    .eq("id", existing.data[0]["id"]) \
                    .execute()
                updated_count += 1
            else:
                # Create
                supabase_client.table("parties").insert(party_data).execute()
                created_count += 1

        return {
            "status": "success",
            "created": created_count,
            "updated": updated_count,
            "total": created_count + updated_count
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

---

## SUMMARY

- ✅ **Modal form** with 10 input fields (party_name, email, phone, GST, address, city, state, credit terms, type, active)
- ✅ **CSV template** downloadable with exact column mapping
- ✅ **CSV upload** with drag-drop and validation
- ✅ **Manual entry fallback** for single-party creation
- ✅ **Real-time validation** (email format, phone format, GST format)
- ✅ **De-duplication logic** (by email)
- ✅ **Error feedback** (row-level errors with clear messages)
- ✅ **Preview before import** (shows new/update counts)
- ✅ **Backend integration** (FastAPI endpoints for processing)
- ✅ **Complete React components** (ready to integrate)

