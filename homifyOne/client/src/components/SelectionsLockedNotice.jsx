import { useNavigate } from 'react-router-dom';


export default function SelectionsLockedNotice() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-12 bg-gray-50">
      <div className="max-w-md text-center bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <p className="text-4xl mb-4">⏰</p>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Your selection deadline has expired</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          You haven't made any selections yet, and the deadline to do so has passed. Please reach out to your developer
          via chat to arrange a new date before continuing.
        </p>
        <button
          onClick={() => navigate('/buyer/messages')}
          className="bg-[#1a4a45] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2d6b62] transition"
        >
          Message Your Developer
        </button>
      </div>
    </div>
  );
}
