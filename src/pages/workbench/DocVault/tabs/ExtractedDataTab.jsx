import React, { useState } from 'react';
import { BsCodeSlash, BsCheckCircleFill, BsExclamationTriangleFill, BsDashCircleFill, BsFileText, BsRobot } from 'react-icons/bs';
import { diService } from '../../../../services/diService';
import { toast } from 'react-hot-toast';

const ConfidenceBadge = ({ score }) => {
  if (score === undefined || score === null) return null;
  const percentage = Math.round(score * 100);
  
  if (score >= 0.9) return <div className="flex items-center gap-1 text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded text-[9px] font-bold"><BsCheckCircleFill /> {percentage}%</div>;
  if (score >= 0.7) return <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded text-[9px] font-bold"><BsExclamationTriangleFill /> {percentage}%</div>;
  return <div className="flex items-center gap-1 text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded text-[9px] font-bold"><BsDashCircleFill /> {percentage}%</div>;
};

const FieldRow = ({ label, fieldData, onChange }) => {
  const value = fieldData?.value !== undefined ? fieldData.value : fieldData || "";
  const confidence = fieldData?.confidence;
  
  return (
    <div className="grid grid-cols-[140px_1fr_60px] gap-4 items-center py-2 border-b border-white/5 last:border-0 group">
      <label className="text-xs font-semibold text-gray-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm font-medium text-gray-200 focus:outline-none focus:border-b focus:border-teal-500/50 hover:bg-white/5 px-2 py-1 -ml-2 rounded transition-colors w-full"
      />
      <div className="text-right flex justify-end">
        <ConfidenceBadge score={confidence} />
      </div>
    </div>
  );
};

export default function ExtractedDataTab({ doc, onUpdate }) {
  const [devMode, setDevMode] = useState(false);
  const note = doc.di_analysis_notes?.[0];
  
  // Construct UFO data, falling back to legacy extracted_data if UFO cols are missing
  const ufoData = note ? {
    document_type: note.document_type || note.extracted_data?.document_type,
    parties: note.parties && Object.keys(note.parties).length > 0 ? note.parties : note.extracted_data?.parties,
    money: note.money && Object.keys(note.money).length > 0 ? note.money : note.extracted_data?.financials,
    taxes: note.taxes && Object.keys(note.taxes).length > 0 ? note.taxes : undefined,
    dates: note.dates && Object.keys(note.dates).length > 0 ? note.dates : note.extracted_data?.document,
    line_items: note.line_items && note.line_items.length > 0 ? note.line_items : note.extracted_data?.line_items,
    raw_extracted: note.extracted_data
  } : {};
  
  const [data, setData] = useState(ufoData);
  const [saving, setSaving] = useState(false);

  if (!note) {
    return <div className="p-8 text-center text-gray-500 text-sm">No extracted data available yet. Document may still be processing.</div>;
  }

  const handleFieldChange = (section, field, newValue) => {
    setData(prev => {
      const updated = { ...prev };
      if (!updated[section]) updated[section] = {};
      
      if (typeof updated[section][field] === 'object' && updated[section][field] !== null) {
        updated[section][field] = { ...updated[section][field], value: newValue };
      } else {
        updated[section][field] = newValue;
      }
      return updated;
    });
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      await diService.updateUfo(doc.id, data);
      toast.success("Changes saved successfully");
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(data) !== JSON.stringify(ufoData);

  return (
    <div className="flex flex-col h-full bg-[#111111]">
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0A0A0A] shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-gray-200">Inspector</h2>
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest bg-white/5 px-2 py-0.5 rounded">
            {(typeof data.document_type === 'object' ? data.document_type?.value : data.document_type) || "Unknown Document"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 cursor-pointer hover:text-gray-200 transition-colors">
            <input 
              type="checkbox" 
              checked={devMode} 
              onChange={() => setDevMode(!devMode)} 
              className="rounded border-gray-600 bg-transparent text-teal-500 focus:ring-teal-500/50" 
            />
            <BsCodeSlash /> Developer Mode
          </label>
          <button
            disabled={!hasChanges || saving}
            onClick={saveChanges}
            className={`px-4 py-1.5 rounded text-xs font-bold transition-colors ${
              hasChanges 
                ? 'bg-teal-500 text-teal-950 hover:bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.2)]' 
                : 'bg-white/5 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : 'Save Edits'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {devMode ? (
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-5 overflow-x-auto h-full">
            <pre className="text-[12px] font-mono text-gray-400 leading-relaxed">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-8 pb-8">
            {/* General */}
            <section>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">General Information</h3>
              <div className="bg-[#161616] border border-white/5 rounded-xl p-4">
                {data.predicted_label !== undefined && (
                  <FieldRow label="Label" fieldData={data.predicted_label} onChange={(val) => handleFieldChange('predicted_label', 'value', val)} />
                )}
                <FieldRow label="Doc Type" fieldData={data.document_type} onChange={(val) => handleFieldChange('document_type', 'value', val)} />
              </div>
            </section>

            {/* Dates (formerly Document Details) */}
            {data.dates && (
              <section>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Dates & Reference</h3>
                <div className="bg-[#161616] border border-white/5 rounded-xl p-4">
                  {Object.entries(data.dates).map(([key, field]) => (
                    <FieldRow 
                      key={key} 
                      label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                      fieldData={field} 
                      onChange={(val) => handleFieldChange('dates', key, val)} 
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Parties */}
            {data.parties && (
              <section>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Parties</h3>
                <div className="bg-[#161616] border border-white/5 rounded-xl p-4 space-y-4">
                  {Object.entries(data.parties).map(([partyRole, details]) => (
                    <div key={partyRole}>
                      <h4 className="text-xs font-bold text-gray-400 capitalize mb-2">{partyRole}</h4>
                      <div className="pl-4 border-l-2 border-white/5 space-y-1">
                        {details && typeof details === 'object' && !details.value ? (
                          Object.entries(details).map(([key, val]) => (
                            <FieldRow 
                              key={`${partyRole}_${key}`}
                              label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              fieldData={val}
                              onChange={(newVal) => {
                                setData(prev => {
                                  const updated = { ...prev };
                                  updated.parties = { ...prev.parties };
                                  updated.parties[partyRole] = { ...prev.parties[partyRole], [key]: newVal };
                                  return updated;
                                });
                              }}
                            />
                          ))
                        ) : (
                          <FieldRow 
                            label={partyRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                            fieldData={details} 
                            onChange={(val) => handleFieldChange('parties', partyRole, val)} 
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Money (formerly Financials) */}
            {data.money && (
              <section>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Money & Totals</h3>
                <div className="bg-[#161616] border border-white/5 rounded-xl p-4">
                  {Object.entries(data.money).map(([key, field]) => (
                    <FieldRow 
                      key={key} 
                      label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                      fieldData={field} 
                      onChange={(val) => handleFieldChange('money', key, val)} 
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Taxes */}
            {data.taxes && (
              <section>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Taxes</h3>
                <div className="bg-[#161616] border border-white/5 rounded-xl p-4">
                  <FieldRow 
                    label="Total Tax" 
                    fieldData={data.taxes.total_tax} 
                    onChange={(val) => handleFieldChange('taxes', 'total_tax', val)} 
                  />
                </div>
              </section>
            )}

            {/* Line Items */}
            {data.line_items && data.line_items.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Line Items</h3>
                <div className="space-y-3">
                  {data.line_items.map((item, idx) => (
                    <div key={idx} className="bg-[#161616] border border-white/5 rounded-xl p-4">
                      {Object.entries(item).map(([key, field]) => (
                        <FieldRow 
                          key={key} 
                          label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                          fieldData={field} 
                          onChange={(val) => {
                            setData(prev => {
                              const updated = { ...prev };
                              updated.line_items = [...prev.line_items];
                              if (typeof updated.line_items[idx][key] === 'object' && updated.line_items[idx][key] !== null) {
                                updated.line_items[idx][key] = { ...updated.line_items[idx][key], value: val };
                              } else {
                                updated.line_items[idx][key] = val;
                              }
                              return updated;
                            });
                          }} 
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Statement Summary (For Bank Statements) */}
            {data.statement_summary && (
              <section>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Statement Summary</h3>
                <div className="bg-[#161616] border border-white/5 rounded-xl p-4">
                  {Object.entries(data.statement_summary).map(([key, field]) => (
                    <FieldRow 
                      key={key} 
                      label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                      fieldData={field} 
                      onChange={(val) => handleFieldChange('statement_summary', key, val)} 
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Transactions (For Bank Statements) */}
            {data.transactions && data.transactions.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Transactions</h3>
                <div className="space-y-3">
                  {data.transactions.map((item, idx) => (
                    <div key={idx} className="bg-[#161616] border border-white/5 rounded-xl p-4">
                      {Object.entries(item).map(([key, field]) => (
                        <FieldRow 
                          key={key} 
                          label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                          fieldData={field} 
                          onChange={(val) => {
                            setData(prev => {
                              const updated = { ...prev };
                              updated.transactions = [...prev.transactions];
                              if (typeof updated.transactions[idx][key] === 'object' && updated.transactions[idx][key] !== null) {
                                updated.transactions[idx][key] = { ...updated.transactions[idx][key], value: val };
                              } else {
                                updated.transactions[idx][key] = val;
                              }
                              return updated;
                            });
                          }} 
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}
