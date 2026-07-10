import { useEffect } from 'react';

export default function InvoicePreviewModal({ open, onClose, fileUrl, fileName }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const ext = fileName?.split('.').pop()?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png'].includes(ext);
  const isPdf = ext === 'pdf';

  const handleDownload = async () => {
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName || 'invoice';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <p className="text-sm font-semibold text-gray-800 truncate pr-4">{fileName}</p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownload}
              className="text-xs font-semibold text-[#1a4a45] border border-[#1a4a45] rounded-lg px-3 py-1.5 hover:bg-[#e8f4f2] transition"
            >
              Download
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg w-8 h-8 flex items-center justify-center transition"
              aria-label="Close preview"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center min-h-[300px]">
          {isPdf && (
            <iframe
              src={fileUrl}
              title={fileName}
              className="w-full h-full min-h-[70vh]"
            />
          )}
          {isImage && (
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-[75vh] object-contain"
            />
          )}
          {!isPdf && !isImage && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📎</p>
              <p className="text-gray-500 text-sm">Preview not available for this file type.</p>
              <button
                onClick={handleDownload}
                className="mt-4 text-sm font-semibold text-[#1a4a45] hover:underline"
              >
                Download instead
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}