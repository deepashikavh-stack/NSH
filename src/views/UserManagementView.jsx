import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, Edit, Trash2, Search, X, Shield, Mail, User as UserIcon, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createPortal } from 'react-dom';

const UserManagementView = () => {
    const { t } = useTranslation();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
    const [selectedUser, setSelectedUser] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        role: 'Security Officer'
    });

    const roles = ['Admin', 'Security Officer', 'Security HOD', 'School Management', 'School Operations'];

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
            alert('Error loading users: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setModalMode('create');
        setFormData({ email: '', full_name: '', role: 'Security Officer' });
        setShowModal(true);
    };

    const handleEdit = (user) => {
        setModalMode('edit');
        setSelectedUser(user);
        setFormData({
            email: user.email,
            full_name: user.full_name,
            role: user.role
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (modalMode === 'create') {
                const { error } = await supabase
                    .from('users')
                    .insert({
                        email: formData.email,
                        full_name: formData.full_name,
                        role: formData.role,
                        is_active: true
                    });

                if (error) throw error;
                alert('User created successfully!');
            } else {
                const { error } = await supabase
                    .from('users')
                    .update({
                        email: formData.email,
                        full_name: formData.full_name,
                        role: formData.role
                    })
                    .eq('id', selectedUser.id);

                if (error) throw error;
                alert('User updated successfully!');
            }

            setShowModal(false);
            fetchUsers();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;

        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', deleteConfirm.id);

            if (error) throw error;
            alert('User deleted successfully!');
            setDeleteConfirm(null);
            fetchUsers();
        } catch (err) {
            alert('Error deleting user: ' + err.message);
        }
    };

    const toggleStatus = async (user) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ is_active: !user.is_active })
                .eq('id', user.id);

            if (error) throw error;
            fetchUsers();
        } catch (err) {
            alert('Error updating status: ' + err.message);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'All' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="animate-fade-in" style={{ padding: '1rem 0' }}>
            {/* Header */}
            <div style={{ padding: '0 1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{t('user_management.title')}</h2>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{t('user_management.subtitle')}</p>
                    </div>
                    <button className="btn-primary" onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plus size={18} /> {t('user_management.create_user')}
                    </button>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder={t('user_management.search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem 0.75rem 3rem',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '12px',
                                color: 'var(--text-main)',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            color: 'var(--text-main)',
                            fontWeight: 600,
                            outline: 'none'
                        }}
                    >
                        <option value="All">{t('user_management.all_roles')}</option>
                        {roles.map(role => (
                            <option key={role} value={role} style={{ backgroundColor: '#1a1d21' }}>{t(`roles.${role.toLowerCase().replace(/ /g, '_')}`)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="card" style={{ margin: '0 1.5rem', padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{t('user_management.table.user')}</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{t('user_management.table.email')}</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{t('user_management.table.role')}</th>
                                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{t('user_management.table.status')}</th>
                                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{t('user_management.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t('kiosk.no_users')}</td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '50%',
                                                    backgroundColor: 'rgba(255,140,0,0.1)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <UserIcon size={20} color="var(--primary)" />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{user.full_name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {new Date(user.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{user.email}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '0.375rem 0.75rem',
                                                borderRadius: '20px',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                backgroundColor: user.role === 'Admin' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                                                color: user.role === 'Admin' ? '#ef4444' : '#3b82f6',
                                                border: `1px solid ${user.role === 'Admin' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}`
                                            }}>
                                                {t(`roles.${user.role.toLowerCase().replace(/ /g, '_')}`)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <button
                                                onClick={() => toggleStatus(user)}
                                                style={{
                                                    padding: '0.375rem 0.75rem',
                                                    borderRadius: '20px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    backgroundColor: user.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                                                    color: user.is_active ? '#10b981' : '#64748b',
                                                    border: `1px solid ${user.is_active ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.2)'}`,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.375rem'
                                                }}
                                            >
                                                {user.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                                {user.is_active ? t('user_management.status.active') : t('user_management.status.inactive')}
                                            </button>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    style={{
                                                        padding: '0.5rem',
                                                        backgroundColor: 'rgba(59,130,246,0.1)',
                                                        border: '1px solid rgba(59,130,246,0.2)',
                                                        borderRadius: '8px',
                                                        color: '#3b82f6',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(user)}
                                                    style={{
                                                        padding: '0.5rem',
                                                        backgroundColor: 'rgba(239,68,68,0.1)',
                                                        border: '1px solid rgba(239,68,68,0.2)',
                                                        borderRadius: '8px',
                                                        color: '#ef4444',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && createPortal(
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(10px)'
                }}>
                    <div className="modal-content-wrapper animate-fade-in-static">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                {modalMode === 'create' ? t('user_management.modal.create_title') : t('user_management.modal.edit_title')}
                            </h3>
                            <button onClick={() => setShowModal(false)} style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                    <Mail size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                    {t('user_management.modal.email')}
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="user@example.com"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--glass-border)',
                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                        color: 'var(--text-main)',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                    <UserIcon size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                    {t('user_management.modal.full_name')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="John Doe"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--glass-border)',
                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                        color: 'var(--text-main)',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                    <Shield size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                    {t('user_management.modal.role')}
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--glass-border)',
                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                        color: 'var(--text-main)',
                                        outline: 'none',
                                        fontWeight: 600
                                    }}
                                >
                                    {roles.map(role => (
                                        <option key={role} value={role} style={{ backgroundColor: '#1a1d21' }}>{t(`roles.${role.toLowerCase().replace(/ /g, '_')}`)}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '0.875rem',
                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        color: 'var(--text-main)',
                                        fontWeight: 600
                                    }}
                                >
                                    {t('user_management.modal.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={loading}
                                    style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', fontWeight: 700 }}
                                >
                                    {loading ? t('user_management.modal.saving') : modalMode === 'create' ? t('user_management.modal.save_create') : t('user_management.modal.save_edit')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && createPortal(
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(5px)'
                }}>
                    <div className="card animate-fade-in-static" style={{ maxWidth: '400px', width: '90%', padding: '2rem', textAlign: 'center' }}>
                        <Trash2 size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>{t('user_management.delete.title')}</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                            {t('user_management.delete.message', { name: deleteConfirm.full_name })}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: '12px', fontWeight: 600 }}
                            >
                                {t('user_management.modal.cancel')}
                            </button>
                            <button
                                onClick={handleDelete}
                                className="btn-primary"
                                style={{ flex: 1, backgroundColor: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.75rem', borderRadius: '12px', fontWeight: 700 }}
                            >
                                {t('user_management.delete.confirm')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default UserManagementView;
