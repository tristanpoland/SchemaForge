// components/SqlModal.jsx
import React from 'react';
import { X } from 'lucide-react';

const SqlModal = ({ sql, onClose }) => {
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(sql);
    // You could add a toast notification here
  };

  const handleDownloadSql = () => {
    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <h2 className="text-xl font-semibold text-white">Generated SQL</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            <X size={20} className="text-white" />
          </button>
        </div>
        
        <div className="flex-1 p-4 overflow-auto">
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-auto whitespace-pre-wrap font-mono border border-gray-700">
            {sql}
          </pre>
        </div>
        
        <div className="flex justify-end gap-2 p-4 border-t border-gray-600">
          <button 
            onClick={handleCopyToClipboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Copy to Clipboard
          </button>
          <button 
            onClick={handleDownloadSql}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Download SQL
          </button>
        </div>
      </div>
    </div>
  );
};

export default SqlModal;