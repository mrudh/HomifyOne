/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ROLES = ['buyer', 'developer', 'supplier', 'admin'];

const ROLE_BADGE = {
  buyer: 'bg-blue-100 text-blue-700',
  developer: 'bg-green-100 text-green-700',
  supplier: 'bg-amber-100 text-amber-700',
  admin: 'bg-gray-200 text-gray-700',
};

function RoleBadge({ role }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${ROLE_BADGE[role] || 'bg-gray-100 text-gray-600'}`}>
      {role}
    </span>
  );
}

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'buyer' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/users', form);
      await onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999] p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
        <h3 className="font-bold text-gray-900">New User Account</h3>

        <div className="space-y-3">
          <input required placeholder="Full name" value={form.name} onChange={handleChange('name')}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
          <input required type="email" placeholder="Email" value={form.email} onChange={handleChange('email')}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
          <input placeholder="Phone (optional)" value={form.phone} onChange={handleChange('phone')}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
          <input required type="password" placeholder="Password (min 6 characters)" value={form.password} onChange={handleChange('password')}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
          <select value={form.role} onChange={handleChange('role')}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm capitalize">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 bg-[#1a4a45] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}

const EMPTY_PROPERTY = {
  developer: '', plotNumber: '', address: '', development: '',
  houseType: '', bedrooms: '', bathrooms: '', floorArea: '',
};

function PropertyDetailsSection({ user, developers }) {
  const [plot, setPlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_PROPERTY);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    api.get(`/plots/buyer/${user._id}`)
      .then(({ data }) => {
        const p = data.plot;
        setPlot(p);
        if (p) {
          setForm({
            developer: p.developer?._id || p.developer || '',
            plotNumber: p.plotNumber || '',
            address: p.address || '',
            development: p.development || '',
            houseType: p.houseType || '',
            bedrooms: p.bedrooms || '',
            bathrooms: p.bathrooms || '',
            floorArea: p.floorArea || '',
          });
        }
      })
      .catch(() => setError('Failed to load property details.'))
      .finally(() => setLoading(false));
  }, [user._id]);

  const handleChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const { data } = await api.put(`/plots/buyer/${user._id}`, form);
      setPlot(data.plot);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save property details.');
    } finally {
      setSaving(false);
    }
  };

  const handleFloorPlan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const body = new FormData();
      body.append('floorPlan', file);
      const { data } = await api.post(`/plots/buyer/${user._id}/floorplan`, body);
      setPlot(data.plot);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="pt-3 border-t border-gray-100">
        <p className="text-xs font-semibold tracking-widest text-gray-400">PROPERTY DETAILS</p>
        <p className="text-xs text-gray-400 mt-2">Loading…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-3 pt-3 border-t border-gray-100">
      <p className="text-xs font-semibold tracking-widest text-gray-400">PROPERTY DETAILS</p>
      {!plot && <p className="text-xs text-gray-400">No plot yet — fill this in to set one up.</p>}

      <select required value={form.developer} onChange={handleChange('developer')}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
        <option value="">Select a developer…</option>
        {developers.map((d) => <option key={d._id} value={d._id}>{d.name} ({d.email})</option>)}
      </select>

      <div className="grid grid-cols-2 gap-3">
        <input required placeholder="Plot number" value={form.plotNumber} onChange={handleChange('plotNumber')}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
        <input required placeholder="Development" value={form.development} onChange={handleChange('development')}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
      </div>

      <input required placeholder="Address" value={form.address} onChange={handleChange('address')}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />

      <div className="grid grid-cols-2 gap-3">
        <input placeholder="House type" value={form.houseType} onChange={handleChange('houseType')}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
        <input placeholder="Floor area (e.g. 1,100 sq ft)" value={form.floorArea} onChange={handleChange('floorArea')}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input type="number" min="0" placeholder="Bedrooms" value={form.bedrooms} onChange={handleChange('bedrooms')}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
        <input type="number" min="0" placeholder="Bathrooms" value={form.bathrooms} onChange={handleChange('bathrooms')}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-green-600">Saved ✓</p>}

      <button type="submit" disabled={saving}
        className="w-full border border-[#1a4a45] text-[#1a4a45] rounded-xl py-2 text-sm font-semibold disabled:opacity-50">
        {saving ? 'Saving…' : 'Save Property Details'}
      </button>

      <div className="pt-2">
        <p className="text-xs text-gray-400 mb-2">Floor plan</p>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
            {plot?.floorPlanUrl ? (
              <img src={plot.floorPlanUrl} alt="Floor plan" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg">🏠</div>
            )}
          </div>
          {plot?._id ? (
            <label className="text-xs font-semibold text-[#1a4a45] border border-[#1a4a45] rounded-xl px-3 py-2 cursor-pointer hover:bg-[#e8f4f2] transition">
              {uploading ? 'Uploading…' : 'Upload Floor Plan'}
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFloorPlan} disabled={uploading} />
            </label>
          ) : (
            <p className="text-xs text-gray-400">Save property details first, then upload the floor plan.</p>
          )}
        </div>
        {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
      </div>
    </form>
  );
}

function EditUserModal({ user, developers, onClose, onSaved }) {
  const [profile, setProfile] = useState({ name: user.name, email: user.email, phone: user.phone || '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess(false);
    try {
      await api.patch(`/users/${user._id}`, profile);
      setProfileSuccess(true);
      await onSaved();
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordError('');
    setPasswordSuccess(false);
    try {
      await api.patch(`/users/${user._id}/password`, { password: newPassword });
      setPasswordSuccess(true);
      setNewPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999] p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Edit User</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={saveProfile} className="space-y-3">
          <p className="text-xs font-semibold tracking-widest text-gray-400">PROFILE</p>
          <input required value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Name" />
          <input required type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Email" />
          <input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Phone" />
          {profileError && <p className="text-xs text-red-600">{profileError}</p>}
          {profileSuccess && <p className="text-xs text-green-600">Saved ✓</p>}
          <button type="submit" disabled={profileSaving}
            className="w-full bg-[#1a4a45] text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50">
            {profileSaving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>

        <form onSubmit={savePassword} className="space-y-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold tracking-widest text-gray-400">RESET PASSWORD</p>
          <input required type="password" minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="New password (min 6 characters)" />
          {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
          {passwordSuccess && <p className="text-xs text-green-600">Password updated ✓</p>}
          <button type="submit" disabled={passwordSaving}
            className="w-full border border-[#1a4a45] text-[#1a4a45] rounded-xl py-2 text-sm font-semibold disabled:opacity-50">
            {passwordSaving ? 'Updating…' : 'Update Password'}
          </button>
        </form>

        {user.role === 'buyer' && (
          <PropertyDetailsSection user={user} developers={developers} />
        )}
      </div>
    </div>
  );
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [creating, setCreating] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const fetchUsers = async () => {
    const { data } = await api.get('/users');
    setUsers(data.users || []);
  };

  useEffect(() => {
    fetchUsers().finally(() => setLoading(false));
  }, []);


  useEffect(() => {
    const editBuyerId = location.state?.editBuyerId;
    if (editBuyerId && users.length > 0) {
      const match = users.find((u) => u._id === editBuyerId);
      if (match) setEditingUser(match);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [users, location.state]);

  const developers = users.filter((u) => u.role === 'developer');
  const filteredUsers = roleFilter === 'all' ? users : users.filter((u) => u.role === roleFilter);

  if (loading) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 sticky top-0 z-10 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900">Manage Users</h1>
        <button onClick={() => setCreating(true)}
          className="bg-[#1a4a45] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#2d6b62] transition">
          + New User
        </button>
      </div>

      <div className="px-4 sm:px-6 py-6 max-w-full space-y-4">
        <div className="flex gap-2 flex-wrap">
          {['all', ...ROLES].map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`text-xs font-medium px-3 py-2 rounded-xl border capitalize transition ${
                roleFilter === r ? 'bg-[#1a4a45] text-white border-[#1a4a45]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a4a45]'
              }`}>
              {r} {r !== 'all' && `(${users.filter((u) => u.role === r).length})`}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-[#f0f8f7]">
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-5 py-3">Name</th>
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-5 py-3">Email</th>
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-5 py-3">Role</th>
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition">
                    <td className="text-left px-5 py-4 align-middle font-medium text-gray-800">{u.name}</td>
                    <td className="text-left px-5 py-4 align-middle text-gray-500">{u.email}</td>
                    <td className="text-left px-5 py-4 align-middle"><RoleBadge role={u.role} /></td>
                    <td className="text-left px-5 py-4 align-middle whitespace-nowrap">
                      <button onClick={() => setEditingUser(u)}
                        className="text-xs font-semibold text-[#1a4a45] hover:underline">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">No users in this category.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {creating && (
        <CreateUserModal onClose={() => setCreating(false)} onCreated={fetchUsers} />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          developers={developers}
          onClose={() => setEditingUser(null)}
          onSaved={fetchUsers}
        />
      )}
    </div>
  );
}
