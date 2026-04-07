import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Car, Search, PlusCircle, Camera, Clock, CheckCircle, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logAudit } from '../lib/audit';
import LogTable from '../components/LogTable';

const VehiclesView = () => {
    const [loading, setLoading] = useState(false);
    const [isMobileHeader, setIsMobileHeader] = useState(window.innerWidth <= 640);
    const [vehicleLogs, setVehicleLogs] = useState([]);
    const [filters, setFilters] = useState({
        fromDate: '',
        toDate: '',
        vehicleType: '',
        isSbu: '',
        status: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [specifyOther, setSpecifyOther] = useState('');

    useEffect(() => {
        const handleResize = () => setIsMobileHeader(window.innerWidth <= 640);
        window.addEventListener('resize', handleResize);
        fetchVehicleLogs();
        const interval = setInterval(fetchVehicleLogs, 10000);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearInterval(interval);
        };
    }, []);

    const fetchVehicleLogs = async () => {
        const { data, error } = await supabase
            .from('vehicle_entries')
            .select('*')
            .order('entry_time', { ascending: false })
            .limit(100);

        if (!error) {
            setVehicleLogs((data || []).map(entry => ({
                ...entry,
                entryDateRaw: entry.entry_time ? entry.entry_time.split('T')[0] : ''
            })));
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => setFilters({
        fromDate: '',
        toDate: '',
        vehicleType: '',
        isSbu: '',
        status: ''
    });

    const filteredLogs = vehicleLogs.filter(entry => {
        const matchesSearch = 
            (entry.vehicle_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (entry.driver_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (entry.purpose || '').toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (filters.fromDate && entry.entryDateRaw < filters.fromDate) return false;
        if (filters.toDate && entry.entryDateRaw > filters.toDate) return false;
        if (filters.vehicleType && entry.vehicle_type !== filters.vehicleType) return false;
        if (filters.isSbu) {
            const isSbuValue = filters.isSbu === 'Yes';
            if (entry.is_sbu_vehicle !== isSbuValue) return false;
        }
        if (filters.status) {
            const isCheckedOut = entry.exit_time != null;
            if (filters.status === 'On-site' && isCheckedOut) return false;
            if (filters.status === 'Checked-out' && !isCheckedOut) return false;
        }
        return true;
    });

    const handleCheckOut = async (vehicle) => {
        const { error } = await supabase
            .from('vehicle_entries')
            .update({ exit_time: new Date().toISOString() })
            .eq('id', vehicle.id);

        if (!error) {
            logAudit('Check-out', 'vehicle_entries', vehicle.id, 'Security Officer', {
                vehicle_number: vehicle.vehicle_number,
                driver: vehicle.driver_name
            });
            fetchVehicleLogs();
        } else {
            alert('Error checking out vehicle');
        }
    };

    const logColumns = [
        { header: 'Time', key: 'entry_time', render: (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        { header: 'Vehicle No', key: 'vehicle_number' },
        { header: 'Type', key: 'vehicle_type' },
        { header: 'Driver', key: 'driver_name' },
        { header: 'Purpose', key: 'purpose' },
        { header: 'SBU', key: 'is_sbu_vehicle', render: (val) => val ? 'Yes' : 'No' },
        { header: 'Status', key: 'exit_time', render: (val) => val ? 'Checked-out' : 'On-site' },
        {
            header: 'Actions',
            key: 'actions',
            render: (_, row) => !row.exit_time ? (
                <button
                    onClick={() => handleCheckOut(row)}
                    className="btn-danger btn-sm btn-pill"
                    style={{ gap: '0.4rem' }}
                >
                    Check-out
                </button>
            ) : (
                <span className="btn-sm btn-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)', fontWeight: 700 }}>
                    <CheckCircle size={12} />
                    Checked out
                </span>
            )
        }
    ];

    // Form State
    const [formData, setFormData] = useState({
        vehicleNumber: '',
        isSbuVehicle: 'No',
        vehicleType: 'Car',
        driverName: '',
        purpose: ''
    });


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data: newEntry, error } = await supabase
                .from('vehicle_entries')
                .insert({
                    vehicle_number: formData.vehicleNumber,
                    vehicle_type: formData.vehicleType === 'Other' ? specifyOther : formData.vehicleType,
                    driver_name: formData.driverName,
                    is_sbu_vehicle: formData.isSbuVehicle === 'Yes',
                    purpose: formData.purpose
                })
                .select()
                .single();


            if (error) throw error;

            logAudit('Log Vehicle', 'vehicle_entries', null, 'Security Officer', {
                vehicle_number: formData.vehicleNumber,
                type: formData.vehicleType,
                driver: formData.driverName,
                is_sbu: formData.isSbuVehicle === 'Yes'
            });
            setFormData({
                vehicleNumber: '',
                isSbuVehicle: 'No',
                vehicleType: 'Car',
                driverName: '',
                purpose: ''
            });
            setSpecifyOther('');
            fetchVehicleLogs();
            alert('Vehicle entry authorized successfully!');
        } catch (error) {
            alert('Error authorizing vehicle: ' + error.message);
        } finally {
            setLoading(false);
        }
    };


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
                </div>
            </div>

            {/* Vehicle Entry Form (Inline) */}
            <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                    <PlusCircle size={20} style={{ color: 'var(--primary)' }} />
                    Log New Vehicle Entry
                </h3>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: isMobileHeader ? '1fr' : 'repeat(3, 1fr)', gap: '1.25rem', alignItems: 'end' }}>
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
                            <option style={{ backgroundColor: '#1a1d21' }}>Three Wheeler</option>
                            <option style={{ backgroundColor: '#1a1d21' }}>Truck (Vendor)</option>
                            <option style={{ backgroundColor: '#1a1d21' }}>Other</option>
                        </select>
                    </div>
                    {formData.vehicleType === 'Other' && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Specify Vehicle Type *</label>
                            <input
                                type="text"
                                required
                                placeholder="E.G., Tractor, Crane"
                                value={specifyOther}
                                onChange={(e) => setSpecifyOther(e.target.value)}
                                style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-main)' }}
                            />
                        </div>
                    )}
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
                    <button type="submit" className="btn-primary" style={{ width: '100%', height: '42px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={loading}>
                        {loading ? 'Processing...' : 'Authorize Entry'}
                    </button>
                </form>
            </div>

            {/* Filter Section */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <Filter size={18} color="var(--primary)" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Filter & Search</h3>
                </div>

                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                        <Search size={18} />
                    </div>
                    <input 
                        type="text"
                        placeholder="Search by vehicle number, driver, or purpose..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '12px', fontSize: '0.875rem' }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>From (Entry)</label>
                        <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} className="input-field" style={{ width: '100%', padding: '0.625rem', fontSize: '0.875rem' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>To (Entry)</label>
                        <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} className="input-field" style={{ width: '100%', padding: '0.625rem', fontSize: '0.875rem' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Vehicle Type</label>
                        <select name="vehicleType" value={filters.vehicleType} onChange={handleFilterChange} className="input-field" style={{ width: '100%', padding: '0.625rem', fontSize: '0.875rem' }}>
                            <option value="">All Types</option>
                            <option value="Car">Car</option>
                            <option value="Van">Van</option>
                            <option value="Bus">Bus</option>
                            <option value="Motorbike">Motorbike</option>
                            <option value="Truck (Vendor)">Truck</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>SBU Vehicle</label>
                        <select name="isSbu" value={filters.isSbu} onChange={handleFilterChange} className="input-field" style={{ width: '100%', padding: '0.625rem', fontSize: '0.875rem' }}>
                            <option value="">All</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Status</label>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="input-field" style={{ width: '100%', padding: '0.625rem', fontSize: '0.875rem' }}>
                            <option value="">All Statuses</option>
                            <option value="On-site">On-site</option>
                            <option value="Checked-out">Checked-out</option>
                        </select>
                    </div>
                </div>
                {(filters.fromDate || filters.toDate || filters.vehicleType || filters.isSbu || filters.status) && (
                    <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1rem' }}>
                        <button onClick={clearFilters} className="btn-secondary btn-sm btn-pill" style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', gap: '0.5rem' }}>Clear Active Filters</button>
                    </div>
                )}
            </div>

            {/* Vehicle Activity Logs */}
            <LogTable
                title="Vehicle Logs"
                data={filteredLogs}
                columns={logColumns}
                period={
                    filters.fromDate && filters.toDate ? `${filters.fromDate} to ${filters.toDate}` :
                    filters.fromDate ? `From ${filters.fromDate}` :
                    filters.toDate ? `Up to ${filters.toDate}` : 'Live Feed'
                }
            />
        </div>
    );
};

export default VehiclesView;
