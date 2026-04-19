
import React from 'react';
import { AnalysisResult, ForgeryStatus, BatchStats } from '../types';

interface DashboardProps {
  history: AnalysisResult[];
  onSelect: (result: AnalysisResult) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ history, onSelect }) => {
  const stats: BatchStats = history.reduce((acc, curr) => {
    acc.total++;
    if (curr.status === ForgeryStatus.FORGED) acc.forged++;
    else if (curr.status === ForgeryStatus.SUSPICIOUS) acc.suspicious++;
    else if (curr.status === ForgeryStatus.AUTHENTIC) acc.authentic++;
    return acc;
  }, { total: 0, forged: 0, suspicious: 0, authentic: 0 });

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Verified', value: stats.total, color: 'blue' },
          { label: 'Forged Detected', value: stats.forged, color: 'red' },
          { label: 'Suspicious Flagged', value: stats.suspicious, color: 'amber' },
          { label: 'Authentic Files', value: stats.authentic, color: 'green' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">{stat.label}</div>
            <div className={`text-3xl font-bold text-${stat.color}-600`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
          <h3 className="font-semibold text-gray-800">Recent Verifications</h3>
          <button className="text-xs text-blue-600 font-medium hover:underline">Export Batch CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Document</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Confidence</th>
                <th className="px-6 py-3">Verification Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                    No documents processed yet
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded border bg-gray-50 overflow-hidden flex-shrink-0">
                          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{item.fileName}</div>
                          <div className="text-xs text-gray-400 uppercase font-mono">{item.fileType.split('/')[1]}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === ForgeryStatus.FORGED ? 'bg-red-100 text-red-700' : 
                        item.status === ForgeryStatus.SUSPICIOUS ? 'bg-amber-100 text-amber-700' : 
                        'bg-green-100 text-green-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.confidenceScore > 0.8 ? 'bg-green-500' : 'bg-amber-500'}`}
                            style={{ width: `${item.confidenceScore * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-gray-500">{(item.confidenceScore * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => onSelect(item)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
