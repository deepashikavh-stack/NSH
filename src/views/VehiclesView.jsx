import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import LogTable from '../components/LogTable';
import { Car, Search, PlusCircle, Camera, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logAudit } from '../lib/audit';

const VehiclesView = () => {
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [entries, setEntries] = useState([]);
    const [filteredEntries, setFilteredEntries] = useState([]);
    const [isMobileHeader, setIsMobileHeader] = useState(window.innerWidth <= 640);

    // Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');
    const [sbuFilter, setSbuFilter] = useState('All');

    useEffect(() => {
        const handleResize = () => setIsMobileHeader(window.innerWidth <= 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Form State
    const [formData, setFormData] = useState({
        vehicleNumber: '',
        isSbuVehicle: 'No',
        vehicleType: 'Car',
        driverName: '',
        purpose: ''
    });

    const fetchEntries = async () => {
        const { data, error } = await supabase
            .from('vehicle_entries')
            .select('id, vehicle_number, vehicle_type, driver_name, is_sbu_vehicle, purpose, entry_time, exit_time, status')
            .order('entry_time', { ascending: false });
        if (data) setEntries(data);
    };

    useEffect(() => {
        fetchEntries();
    }, []);

    useEffect(() => {
        let result = entries;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(entry =>
                entry.vehicle_number?.toLowerCase().includes(query) ||
                entry.driver_name?.toLowerCase().includes(query) ||
                entry.purpose?.toLowerCase().includes(query)
            );
        }

        if (typeFilter !== 'All') {
            result = result.filter(entry => entry.vehicle_type === typeFilter);
        }

        if (sbuFilter !== 'All') {
            const isSbu = sbuFilter === 'Yes';
            result = result.filter(entry => entry.is_sbu_vehicle === isSbu);
        }

        setFilteredEntries(result);
    }, [entries, searchQuery, typeFilter, sbuFilter]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase
                .from('vehicle_entries')
                .insert({
                    vehicle_number: formData.vehicleNumber,
                    vehicle_type: formData.vehicleType,
                    driver_name: formData.driverName,
                    is_sbu_vehicle: formData.isSbuVehicle === 'Yes',
                    purpose: formData.purpose
                });


            if (error) throw error;

            await fetchEntries();
            logAudit('Log Vehicle', 'vehicle_entries', null, 'Security Officer', {
                vehicle_number: formData.vehicleNumber,
                type: formData.vehicleType,
                driver: formData.driverName,
                is_sbu: formData.isSbuVehicle === 'Yes'
            });
            setShowForm(false);
            setFormData({
                vehicleNumber: '',
                isSbuVehicle: 'No',
                vehicleType: 'Car',
                driverName: '',
                purpose: ''
            });
            alert('Vehicle entry logged successfully!');
        } catch (error) {
            alert('Error logging vehicle: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckOut = async (vehicleId) => {
        const { error } = await supabase
            .from('vehicle_entries')
            .update({ exit_time: new Date().toISOString() })
            .eq('id', vehicleId);

        if (error) {
            alert("Error checking out vehicle: " + error.message);
        } else {
            const vehicle = entries.find(e => e.id === vehicleId);
            logAudit('Check-out Vehicle', 'vehicle_entries', vehicleId, 'Admin', {
                vehicle_number: vehicle?.vehicle_number,
                driver: vehicle?.driver_name
            });
            await fetchEntries();
        }
    };

    const columns = [
        { header: 'Vehicle Number', key: 'vehicle_number' },
        { header: 'Type', key: 'vehicle_type' },
        { header: 'Driver', key: 'driver_name' },
        { header: 'SBU Vehicle', key: 'is_sbu_vehicle', render: (val) => val ? 'Yes' : 'No' },
        { header: 'Purpose', key: 'purpose' },
        { header: 'Entry Time', key: 'entry_time', render: (val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        {
            header: 'Exit Time',
            key: 'exit_time',
            render: (val, row) => {
                if (val) return new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                    <button
                        onClick={() => handleCheckOut(row.id)}
                        style={{
                            padding: '4px 12px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            color: '#3b82f6',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        Check-out
                    </button>
                );
            }
        },
    ];

    return (
        <div className="animate-fade-in" style={{ padding: '1rem 0' }}>
            <div style={{
                display: 'flex',
                flexDirection: isMobileHeader ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobileHeader ? 'flex-start' : 'center',
                gap: '1.5rem',
                marginBottom: '2.5rem',
                padding: '0 1rem'
            }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Vehicle Management</h2>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Secure monitoring of all vehicle access points.</p>
                </div>
                <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    width: isMobileHeader ? '100%' : 'auto'
                }}>
                    <button style={{
                        flex: isMobileHeader ? 1 : 'none',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-secondary)',
                        borderRadius: '12px',
                        justifyContent: 'center'
                    }} className="desktop-only">
                        <Camera size={18} /> ANPR Simulation
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => setShowForm(true)}
                        style={{
                            flex: isMobileHeader ? 1 : 'none',
                            borderRadius: '12px',
                            justifyContent: 'center'
                        }}
                    >
                        <PlusCircle size={18} /> Log Vehicle
                    </button>
                </div>
            </div>

            {/* Search and Filters Bar */}
            <div style={{
                display: 'flex',
                flexDirection: isMobileHeader ? 'column' : 'row',
                gap: '1rem',
                marginBottom: '1.5rem',
                padding: '0 1rem'
            }}>
                <div style={{ position: 'relative', flex: 2 }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search vehicle, driver or purpose..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem 1rem 0.75rem 3rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            color: 'var(--text-main)',
                            fontSize: '0.875rem'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '1rem', flex: 1.5 }}>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            color: 'var(--text-main)',
                            fontSize: '0.875rem',
                            outline: 'none'
                        }}
                    >
                        <option style={{ backgroundColor: '#1a1d21' }}>All Types</option>
                        <option style={{ backgroundColor: '#1a1d21' }}>Car</option>
                        <option style={{ backgroundColor: '#1a1d21' }}>Van</option>
                        <option style={{ backgroundColor: '#1a1d21' }}>Bus</option>
                        <option style={{ backgroundColor: '#1a1d21' }}>Motorbike</option>
                        <option style={{ backgroundColor: '#1a1d21' }}>Truck (Vendor)</option>
                    </select>
                    <select
                        value={sbuFilter}
                        onChange={(e) => setSbuFilter(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            color: 'var(--text-main)',
                            fontSize: '0.875rem',
                            outline: 'none'
                        }}
                    >
                        <option style={{ backgroundColor: '#1a1d21' }} value="All">All SBU</option>
                        <option style={{ backgroundColor: '#1a1d21' }} value="Yes">SBU Only</option>
                        <option style={{ backgroundColor: '#1a1d21' }} value="No">Non-SBU</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <LogTable title="Live Vehicle Log" data={filteredEntries} columns={columns} />
            </div>

            {showForm && createPortal(
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)'
                }}>
                    <div className="modal-content-wrapper animate-fade-in-static">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Access Log - Vehicle</h3>
                            <button
                                onClick={() => setShowForm(false)}
                                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '0.5rem', borderRadius: '10px' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>

                            {/* Timestamp Display */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Access Timestamp</label>
                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '12px',
                                    color: 'var(--text-main)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    fontWeight: 600,
                                    border: '1px solid var(--glass-border)'
                                }}>
                                    <Clock size={16} style={{ color: 'var(--primary)' }} />
                                    {new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Vehicle Reg. No *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="E.G., CAB-1234"
                                    value={formData.vehicleNumber}
                                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>SBU Vehicle</label>
                                <select
                                    value={formData.isSbuVehicle}
                                    onChange={(e) => setFormData({ ...formData, isSbuVehicle: e.target.value })}
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-main)' }}
                                >
                                    <option style={{ backgroundColor: '#1a1d21' }}>No</option>
                                    <option style={{ backgroundColor: '#1a1d21' }}>Yes</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Type of Vehicle</label>
                                <select
                                    value={formData.vehicleType}
                                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-main)' }}
                                >
                                    <option style={{ backgroundColor: '#1a1d21' }}>Car</option>
                                    <option style={{ backgroundColor: '#1a1d21' }}>Van</option>
                                    <option style={{ backgroundColor: '#1a1d21' }}>Bus</option>
                                    <option style={{ backgroundColor: '#1a1d21' }}>Motorbike</option>
                                    <option style={{ backgroundColor: '#1a1d21' }}>Truck (Vendor)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Driver Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter driver name"
                                    value={formData.driverName}
                                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Purpose of Entry *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Delivery, Staff, Maintenance"
                                    value={formData.purpose}
                                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>
                                    {loading ? 'Processing...' : 'Authorize Entry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default VehiclesView;
