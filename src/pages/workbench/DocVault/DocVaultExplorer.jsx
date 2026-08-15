import React, { useState } from 'react';
import { 
  BsFolderFill, 
  BsFileEarmarkText, 
  BsPlusLg, 
  BsCloudUpload, 
  BsSearch, 
  BsChevronRight, 
  BsHouse, 
  BsTrash, 
  BsThreeDotsVertical, 
  BsFolderSymlink, 
  BsGrid, 
  BsListUl,
  BsExclamationCircle,
  BsFolderPlus
} from 'react-icons/bs';
import { useWorkbench } from '../../../context/WorkbenchContext';
import { formatCurrency } from '../../../utils/currency';
import { classifyDocumentParties } from '../../../utils/docPartyClassifier';

const StatusBadge = ({ status }) => {
  const styles = {
    'Uploaded': 'bg-gray-500/20 text-gray-400 border-gray-500/20',
    'Processing': 'bg-amber-500/20 text-amber-500 border-amber-500/20',
    'Needs Review': 'bg-rose-500/20 text-rose-400 border-rose-500/20',
    'Ready to Post': 'bg-blue-500/20 text-blue-400 border-blue-500/20',
    'Posted': 'bg-teal-500/20 text-teal-400 border-teal-500/20',
    'Failed': 'bg-red-500/20 text-red-500 border-red-500/20'
  };

  const style = styles[status] || styles['Uploaded'];

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider uppercase ${style}`}>
      {status}
    </span>
  );
};

export default function DocVaultExplorer({
  folders = [],
  documents = [],
  currentFolderId = null,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onSelectDocument,
  onDeleteDocument,
  onOpenMoveModal,
  onMoveDocument,
  onDropFiles,
  loading,
  uploading
}) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [openDropdown, setOpenDropdown] = useState(null);
  const [dragOverFolderId, setDragOverFolderId] = useState(null);
  const { activeWorkbench } = useWorkbench();

  // Active folder object
  const currentFolder = folders.find(f => f.id === currentFolderId);

  // Compute folder hierarchy path for breadcrumbs
  const getBreadcrumbs = () => {
    const crumbs = [];
    let curr = currentFolder;
    while (curr) {
      crumbs.unshift(curr);
      curr = folders.find(f => f.id === curr.parent_id);
    }
    return crumbs;
  };
  const breadcrumbs = getBreadcrumbs();

  // Filter subfolders for current level
  const subFolders = folders.filter(f => {
    if (search.trim()) {
      return f.name.toLowerCase().includes(search.toLowerCase().trim());
    }
    const pId = f.parent_id || null;
    return pId === (currentFolderId || null);
  });

  // Filter documents for current level
  const filteredDocs = documents.filter(doc => {
    const term = search.toLowerCase().trim();
    if (term) {
      const note = doc.di_analysis_notes?.[0]?.extracted_data;
      const party = note?.parties?.vendor?.value || note?.parties?.customer?.value || "";
      const ref = note?.document?.reference_number?.value || "";
      return (
        doc.original_filename.toLowerCase().includes(term) ||
        party.toLowerCase().includes(term) ||
        ref.toLowerCase().includes(term) ||
        (doc.derivedStatus && doc.derivedStatus.toLowerCase().includes(term))
      );
    }
    const docFolderId = doc.folder_id || null;
    return docFolderId === (currentFolderId || null);
  });

  // Helper stats for folders
  const getFolderStats = (folderId) => {
    const folderDocs = documents.filter(d => (d.folder_id || null) === folderId);
    let totalVal = 0;
    folderDocs.forEach(d => {
      const note = d.di_analysis_notes?.[0];
      const amt = note?.money?.total_amount !== undefined ? note.money?.total_amount : note?.extracted_data?.financials?.total_amount?.value;
      if (amt && typeof amt === 'number') totalVal += amt;
    });
    return { count: folderDocs.length, totalVal };
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#0D0D0D] text-gray-200 overflow-hidden font-sans">
      {/* Top Header & Breadcrumbs Toolbar */}
      <div className="px-6 py-4 border-b border-white/5 bg-[#121214] flex flex-wrap items-center justify-between gap-4 shrink-0">
        
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 text-sm font-medium scrollbar-none">
          <button
            onClick={() => onSelectFolder(null)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
              currentFolderId === null 
                ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 font-semibold' 
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <BsHouse className="text-base" />
            <span>Root Vault</span>
          </button>

          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <BsChevronRight className="text-gray-600 text-xs shrink-0" />
              <button
                onClick={() => onSelectFolder(crumb.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors max-w-[180px] truncate ${
                  crumb.id === currentFolderId
                    ? 'bg-teal-500/10 border-teal-500/30 text-teal-300 font-semibold'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                style={{ borderColor: crumb.id === currentFolderId ? `${crumb.color || '#14b8a6'}50` : undefined }}
              >
                <BsFolderFill style={{ color: crumb.color || '#14b8a6' }} className="shrink-0 text-sm" />
                <span className="truncate">{crumb.name}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative w-64">
            <BsSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs" />
            <input
              type="text"
              placeholder="Search folders or documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#18181A] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-[#18181A] border border-white/10 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "bg-teal-500/20 text-teal-400" : "text-gray-400 hover:text-white"}`}
              title="Grid View"
            >
              <BsGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-teal-500/20 text-teal-400" : "text-gray-400 hover:text-white"}`}
              title="List View"
            >
              <BsListUl size={15} />
            </button>
          </div>

          {/* Create Folder Button */}
          <button
            onClick={onCreateFolder}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-teal-400 hover:text-teal-300 font-semibold text-xs rounded-xl transition-colors"
          >
            <BsFolderPlus className="text-sm" />
            <span>New Folder</span>
          </button>

          {/* Upload Button */}
          <label className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-black px-4 py-2 rounded-xl font-bold text-xs cursor-pointer transition-colors shadow-lg shadow-teal-500/10">
            <BsCloudUpload className="text-base" />
            <span>Upload File</span>
            <input 
              type="file" 
              className="hidden" 
              onChange={(e) => onDropFiles(Array.from(e.target.files))} 
              accept=".pdf,.jpg,.jpeg,.png" 
            />
          </label>
        </div>
      </div>

      {/* Main Content Explorer Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* FOLDERS SECTION */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <BsFolderFill className="text-teal-500" />
              Folders ({subFolders.length})
            </h2>
          </div>

          {subFolders.length === 0 ? (
            <div className="p-6 border border-dashed border-white/10 rounded-2xl text-center bg-[#141416]/50">
              <p className="text-xs text-gray-500">No subfolders here. Click "+ New Folder" to organize files.</p>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "flex flex-col gap-2"}>
              {subFolders.map((folder) => {
                const stats = getFolderStats(folder.id);
                const isDragOver = dragOverFolderId === folder.id;

                return (
                  <div
                    key={folder.id}
                    onClick={() => onSelectFolder(folder.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverFolderId(folder.id);
                    }}
                    onDragLeave={() => setDragOverFolderId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverFolderId(null);
                      const docId = e.dataTransfer.getData("text/plain");
                      if (docId && onMoveDocument) {
                        onMoveDocument(docId, folder.id);
                      }
                    }}
                    className={`group border rounded-2xl p-4 cursor-pointer transition-all relative ${
                      isDragOver
                        ? 'bg-teal-500/20 border-teal-500 scale-[1.02] shadow-xl'
                        : 'bg-[#18181A] hover:bg-[#202024] border-white/10 hover:border-teal-500/40 shadow-lg'
                    } ${viewMode === "grid" ? "flex flex-col justify-between" : "flex items-center justify-between"}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105"
                          style={{ 
                            backgroundColor: `${folder.color || '#14b8a6'}18`,
                            borderColor: `${folder.color || '#14b8a6'}35`
                          }}
                        >
                          <BsFolderFill size={22} style={{ color: folder.color || '#14b8a6' }} />
                        </div>
                        <div className="truncate pr-2">
                          <h3 className="font-bold text-white text-sm group-hover:text-teal-400 transition-colors truncate">
                            {folder.name}
                          </h3>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {stats.count} item{stats.count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      {/* Folder Actions Dropdown */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdown(openDropdown === folder.id ? null : folder.id);
                          }}
                          className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <BsThreeDotsVertical />
                        </button>

                        {openDropdown === folder.id && (
                          <div 
                            className="absolute right-0 top-8 w-36 bg-[#222226] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-150"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setOpenDropdown(null);
                                onDeleteFolder(folder.id);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
                            >
                              <BsTrash size={12} />
                              Delete Folder
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats Footer */}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
                      <span>Total Value</span>
                      <span className="font-bold text-teal-400">
                        {stats.totalVal > 0 ? formatCurrency(stats.totalVal, activeWorkbench?.country) : "-"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FILES / DOCUMENTS SECTION */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <BsFileEarmarkText className="text-teal-500" />
              Files ({filteredDocs.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500 animate-pulse text-sm">
              Loading financial documents...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center bg-[#141416]/50">
              <BsCloudUpload className="text-4xl text-gray-600 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-gray-400">No documents in this folder</p>
              <p className="text-xs text-gray-600 mt-1">Upload external PDFs or invoices here to trigger automatic AI parsing.</p>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "flex flex-col gap-2"}>
              {filteredDocs.map((doc) => {
                const note = doc.di_analysis_notes?.[0] || {};
                const data = note.extracted_data || {};
                
                const rawDocType = note.document_type || data.document_type;
                const docType = (typeof rawDocType === 'object' ? rawDocType?.value : rawDocType) || "Document";
                const refNumber = data.document?.reference_number?.value || "No Ref";
                
                const amount = note.money?.total_amount !== undefined ? note.money?.total_amount : data.financials?.total_amount?.value;
                const displayAmount = amount !== undefined ? formatCurrency(amount, activeWorkbench?.country) : "-";
                
                const showWarning = doc.derivedStatus === 'Needs Review';
                const classified = classifyDocumentParties(doc, activeWorkbench);
                const partyName = classified.externalParty?.name || "Unknown Party";

                return (
                  <div
                    key={doc.id}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", doc.id);
                    }}
                    onClick={() => onSelectDocument(doc)}
                    className="group bg-[#18181A] hover:bg-[#202024] border border-white/10 hover:border-teal-500/40 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between shadow-lg relative"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-bold text-white text-sm truncate pr-2 flex items-center gap-1.5 group-hover:text-teal-400 transition-colors">
                          {partyName}
                          {showWarning && <BsExclamationCircle className="text-rose-500 text-xs shrink-0" title="Needs Review" />}
                        </div>
                        <div className="font-bold text-teal-400 text-sm shrink-0">
                          {displayAmount}
                        </div>
                      </div>

                      <div className="text-xs text-gray-400 flex items-center gap-1.5 truncate mb-4">
                        <BsFileEarmarkText className="text-gray-500 shrink-0" />
                        <span className="truncate">{docType} • {refNumber}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <StatusBadge status={doc.derivedStatus} />

                      <div className="flex items-center gap-2">
                        {onOpenMoveModal && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenMoveModal(doc);
                            }}
                            className="p-1.5 text-gray-400 hover:text-teal-400 hover:bg-teal-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Move to Folder"
                          >
                            <BsFolderSymlink size={14} />
                          </button>
                        )}
                        {onDeleteDocument && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDocument(doc.id, e);
                            }}
                            className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete Document"
                          >
                            <BsTrash size={14} />
                          </button>
                        )}
                        <span className="text-[10px] text-gray-500">
                          {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
