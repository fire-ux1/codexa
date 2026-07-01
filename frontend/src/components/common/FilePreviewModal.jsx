export default function FilePreviewModal({ previewFile, previewContent, isPreviewLoading, onClose }) {
  if (!previewFile) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900/95 border border-white/10 rounded-3xl p-6 flex flex-col max-h-[85vh] shadow-2xl relative animate-fade-in glass">

        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-white font-mono truncate">{previewFile.split("/").pop()}</h3>
            <p className="text-[10px] text-gray-500 font-mono truncate mt-0.5">{previewFile}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-all text-xs"
          >
            ✕ Close
          </button>
        </div>

        <div className="flex-grow overflow-auto bg-black/40 border border-white/5 rounded-2xl p-4 min-h-[350px]">
          {isPreviewLoading ? (
            <div className="flex items-center justify-center h-full">
              <span className="w-6 h-6 border-2 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin"></span>
            </div>
          ) : (
            <pre className="font-mono text-xs text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">
              {previewContent}
            </pre>
          )}
        </div>

      </div>
    </div>
  );
}
