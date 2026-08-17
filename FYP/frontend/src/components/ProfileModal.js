import React, { useState } from 'react';
import { X, User, Shield, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './ProfileModal.css';

const NAV_ITEMS = [
  { id: 'profile',  label: 'Profile',           icon: User   },
  { id: 'security', label: 'Password & Security', icon: Shield },
  { id: 'account',  label: 'Account',            icon: Bell   },
];

const ProfileModal = ({ onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState('profile');

  /* ── Profile section state ── */
  const [name, setName]       = useState(user?.name || '');
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState({ type: '', text: '' });

  /* ── Security section state ── */
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [pwSaving, setPwSaving]     = useState(false);

  const getInitials = (n = '') =>
    n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const roleLabel = { admin: 'Administrator', teacher: 'Teacher', student: 'Student' }[user?.role] || user?.role;

  const handleSaveProfile = async () => {
    if (!name.trim()) return setMsg({ type: 'error', text: 'Name cannot be empty.' });
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      await api.put('/auth/profile', { name: name.trim() });
      setMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch {
      setMsg({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw)
      return setMsg({ type: 'error', text: 'Please fill in all password fields.' });
    if (newPw !== confirmPw)
      return setMsg({ type: 'error', text: 'New passwords do not match.' });
    if (newPw.length < 6)
      return setMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
    setPwSaving(true);
    setMsg({ type: '', text: '' });
    try {
      await api.put('/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
      setMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to change password.' });
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/');
  };

  const switchSection = (id) => {
    setActive(id);
    setMsg({ type: '', text: '' });
  };

  return (
    <>
      <div className="pm-overlay" onClick={onClose} />
      <div className="pm-modal" role="dialog" aria-modal="true" aria-label="Profile settings">

        {/* ── Close ── */}
        <button className="pm-close" onClick={onClose} aria-label="Close"><X size={18} /></button>

        {/* ── Sidebar ── */}
        <aside className="pm-sidebar">
          <div className="pm-sidebar__avatar">
            <div className="pm-avatar">{getInitials(user?.name)}</div>
            <div>
              <p className="pm-sidebar__name">{user?.name}</p>
              <p className="pm-sidebar__role">{roleLabel}</p>
            </div>
          </div>

          <nav className="pm-sidebar__nav">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`pm-nav-item ${active === id ? 'pm-nav-item--active' : ''}`}
                onClick={() => switchSection(id)}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>

          <button className="pm-nav-item pm-nav-item--danger pm-logout" onClick={handleLogout}>
            <LogOut size={16} />
            Sign out
          </button>
        </aside>

        {/* ── Content ── */}
        <main className="pm-content">

          {/* Shared message */}
          {msg.text && (
            <div className={`pm-msg pm-msg--${msg.type}`}>{msg.text}</div>
          )}

          {/* ── Profile ── */}
          {active === 'profile' && (
            <section>
              <h2 className="pm-content__title">Your profile</h2>
              <p className="pm-content__sub">Manage your personal details.</p>

              {/* Avatar display */}
              <div className="pm-profile-avatar-row">
                <div className="pm-avatar pm-avatar--lg">{getInitials(user?.name)}</div>
                <div>
                  <p className="pm-avatar-hint">Your initials are used as your avatar.</p>
                </div>
              </div>

              <div className="pm-field">
                <label>Full name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
              </div>

              <div className="pm-field">
                <label>Email address</label>
                <input value={user?.email || ''} disabled />
              </div>

              <div className="pm-field">
                <label>Role</label>
                <input value={roleLabel} disabled />
              </div>

              {user?.registrationNo && (
                <div className="pm-field">
                  <label>Registration No.</label>
                  <input value={user.registrationNo} disabled />
                </div>
              )}

              {user?.program && (
                <div className="pm-field">
                  <label>Program</label>
                  <input value={`${user.program}${user.semester ? ` — Semester ${user.semester}` : ''}`} disabled />
                </div>
              )}

              <button className="pm-btn pm-btn--primary" onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </section>
          )}

          {/* ── Security ── */}
          {active === 'security' && (
            <section>
              <h2 className="pm-content__title">Password & Security</h2>
              <p className="pm-content__sub">Update your password to keep your account secure.</p>

              <div className="pm-field">
                <label>Current password</label>
                <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Enter current password" autoComplete="current-password" />
              </div>
              <div className="pm-field">
                <label>New password</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Enter new password" autoComplete="new-password" />
              </div>
              <div className="pm-field">
                <label>Confirm new password</label>
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter new password" autoComplete="new-password" />
              </div>

              <button className="pm-btn pm-btn--primary" onClick={handleChangePassword} disabled={pwSaving}>
                {pwSaving ? 'Updating…' : 'Update password'}
              </button>
            </section>
          )}

          {/* ── Account ── */}
          {active === 'account' && (
            <section>
              <h2 className="pm-content__title">Account</h2>
              <p className="pm-content__sub">Overview of your account details.</p>

              <div className="pm-info-grid">
                <div className="pm-info-card">
                  <span className="pm-info-card__label">Name</span>
                  <span className="pm-info-card__value">{user?.name}</span>
                </div>
                <div className="pm-info-card">
                  <span className="pm-info-card__label">Email</span>
                  <span className="pm-info-card__value">{user?.email}</span>
                </div>
                <div className="pm-info-card">
                  <span className="pm-info-card__label">Role</span>
                  <span className="pm-info-card__value">{roleLabel}</span>
                </div>
                {user?.registrationNo && (
                  <div className="pm-info-card">
                    <span className="pm-info-card__label">Registration No.</span>
                    <span className="pm-info-card__value">{user.registrationNo}</span>
                  </div>
                )}
                {user?.program && (
                  <div className="pm-info-card">
                    <span className="pm-info-card__label">Program</span>
                    <span className="pm-info-card__value">{user.program}</span>
                  </div>
                )}
                {user?.semester && (
                  <div className="pm-info-card">
                    <span className="pm-info-card__label">Semester</span>
                    <span className="pm-info-card__value">{user.semester}</span>
                  </div>
                )}
              </div>
            </section>
          )}

        </main>
      </div>
    </>
  );
};

export default ProfileModal;
