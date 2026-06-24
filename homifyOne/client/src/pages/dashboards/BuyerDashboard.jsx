import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getCountdown = (deadline) => {
  if (!deadline) return null;

  const diff = new Date(deadline) - new Date();
  if (diff <= 0) return { expired: true, days: 0, date: '' };
  return {
    expired: false,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    date: new Date(deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  };
};

const StatusBadge = ({ status }) => {
  const map = {
        draft: {
            label: 'Not Started',
            cls: 'bg-gray-100 text-gray-500'
        },
        selections_pending: {
            label: 'In Progress',
            cls: 'bg-yellow-100 text-yellow-700'
        },
        submitted: {
            label: 'Under Review',
            cls: 'bg-blue-100 text-blue-700'
        },
        selections_submitted: {
            label: 'Under Review',
            cls: 'bg-blue-100 text-blue-700'
        },
        approved: {
            label: 'Approved ✓',
            cls: 'bg-green-100 text-green-700'
        },
        selections_approved: {
            label: 'Approved ✓',
            cls: 'bg-green-100 text-green-700'
        },
        rejected: {
            label: 'Changes Needed',
            cls: 'bg-red-100 text-red-700'
        },
    };
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-500' };
  return <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${s.cls}`}>{s.label}</span>;
};

export default function BuyerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [plot, setPlot] = useState(null);
  const [selection, setSelection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plotRes, selRes] = await Promise.all([
          axios.get(`${API}/plots/my`, { withCredentials: true }),
          axios.get(`${API}/selections`, { withCredentials: true }),
        ]);
        setPlot(plotRes.data.plot);
        setSelection(selRes.data.selections);
      } catch (err) {
        console.error('Dashboard load error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const countdown = getCountdown(plot?.deadline);
  const selStatus = selection?.status || 'draft';
  const roomsChosen = selection?.choices?.length || 0;
  const extrasAdded = selection?.extras?.length || 0;
  const extrasTotal = selection?.totalExtrasPrice || 0;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
      <div>
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

          {countdown && (
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border
              ${countdown.expired ? 'bg-red-50 border-red-200'
              : countdown.days <= 7 ? 'bg-orange-50 border-orange-200'
              : 'bg-red-50 border-red-100'}`}>
              <span className="text-lg">⏰</span>
              <div>
                <p className="text-xs text-gray-400 font-medium leading-none mb-0.5">Selection Deadline</p>
                <p className={`font-bold text-sm leading-none
                  ${countdown.expired ? 'text-red-600' : countdown.days <= 7 ? 'text-orange-600' : 'text-red-600'}`}>
                  {countdown.date}
                </p>
                <p className="text-xs text-red-400 mt-0.5">
                  {countdown.expired ? 'Deadline passed' : `${countdown.days} days left`}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-6 max-w-5xl">

          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              {greeting()}, {user?.name?.split(' ')[0]} 👋
            </h2>
            <p className="text-gray-400 text-sm mt-0.5">Here's an overview of your home selections.</p>
          </div>

          {plot ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-xl bg-[#e8f4f2] flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-[#1a4a45]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M3 9.75L12 3l9 6.75V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.75z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 21V12h6v9" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-widest text-gray-400 mb-0.5">YOUR PLOT</p>
                    <h3 className="text-lg font-bold text-gray-900">Plot {plot.plotNumber}</h3>
                    <p className="text-[#1a4a45] text-sm font-medium">{plot.development}</p>
                    <p className="text-gray-400 text-sm">{plot.address}</p>
                  </div>
                </div>
                <StatusBadge status={plot.status} />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center mb-6">
              <p className="text-4xl mb-3">🏠</p>
              <p className="text-gray-500 font-medium">No plot assigned yet</p>
              <p className="text-gray-400 text-sm mt-1">Contact your developer to get started.</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Rooms Chosen', value: roomsChosen, icon: '🛋️', sub: 'Standard choices', accent: 'border-l-[#1a4a45]' },
              { label: 'Extras Added', value: extrasAdded, icon: '✨', sub: 'Optional upgrades', accent: 'border-l-indigo-400' },
              { label: 'Extras Total', value: `£${extrasTotal.toLocaleString()}`, icon: '💷', sub: 'Estimated cost', accent: 'border-l-emerald-500' },
              { label: 'Selection Status', value: <StatusBadge status={selStatus} />, icon: '📋', sub: 'Current progress', accent: 'border-l-amber-400' },
            ].map(card => (
              <div key={card.label}
                className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${card.accent} shadow-sm p-5`}>
                <span className="text-2xl">{card.icon}</span>
                <div className="text-xl font-bold text-gray-800 mt-3">{card.value}</div>
                <p className="text-xs font-semibold text-gray-700 mt-1">{card.label}</p>
                <p className="text-xs text-gray-400">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: 'Standard Choices',
                desc: 'Pick your room finishes and fittings',
                icon: '🛋️',
                path: '/buyer/choices',
                disabled: selStatus === 'approved',
                accent: 'hover:border-[#1a4a45]',
              },
              {
                title: 'Extras Catalogue',
                desc: 'Browse and add optional upgrades',
                icon: '✨',
                path: '/buyer/extras',
                disabled: selStatus === 'approved',
                accent: 'hover:border-indigo-400',
              },
              {
                title: selStatus === 'submitted' ? 'Awaiting Review' : selStatus === 'approved' ? 'Selections Approved' : selStatus === 'rejected' ? 'Revise & Resubmit' : 'Submit Selections',
                desc: selStatus === 'submitted' ? 'Under developer review' : selStatus === 'approved' ? 'Your selections have been approved ✅' : selStatus === 'rejected' ? selection?.rejectionReason || 'Revise your selections' : 'Submit your choices for developer approval',
                icon: selStatus === 'approved' ? '✅' : selStatus === 'submitted' ? '🕐' : selStatus === 'rejected' ? '⚠️' : '📤',
                path: '/buyer/selections',
                disabled: selStatus === 'submitted' || selStatus === 'approved',
                accent: 'hover:border-green-400',
              },
            ].map(card => (
              <button key={card.title}
                onClick={() => !card.disabled && navigate(card.path)}
                className={`bg-white rounded-2xl border-2 border-gray-100 p-6 text-left transition-all shadow-sm
                  ${card.disabled ? 'opacity-50 cursor-not-allowed' : `cursor-pointer ${card.accent}`}`}>
                <span className="text-3xl">{card.icon}</span>
                <h3 className="font-semibold text-gray-800 mt-3 text-sm">{card.title}</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{card.desc}</p>
              </button>
            ))}
          </div>

        </div>
      </div>
  );
}