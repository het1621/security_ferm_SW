import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Terminal, ShieldAlert, CheckCircle2, Trash2, X, Activity, Server, Smartphone, ExternalLink, RefreshCw } from 'lucide-react';
import api from '../services/api'; // note: we won't use api if we bypass auth interceptor, but let's use standard fetch or configure headers

function DeveloperConsole() {
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [viewError, setViewError] = useState(null); // Selected error details
  const [filter, setFilter] = useState('unresolved'); // unresolved, all

  const savedServerIP = localStorage.getItem('serverIP');
  const defaultAPI = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const baseURL = savedServerIP ? `http://${savedServerIP}:5000/api` : defaultAPI;

  const fetchErrors = async (code = passcode) => {
    try {
      setLoading(true);
      setAuthError('');
      
      const token = localStorage.getItem('token');
      const headers = {
        'x-master-passcode': code
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${baseURL}/errors${filter === 'unresolved' ? '?is_resolved=false' : ''}`, { headers });
      const data = await res.json();
      if (res.ok && data.success) {
        setErrors(data.data || []);
        setIsAuthenticated(true);
      } else {
        if (code) { // Only show auth error if they actively typed a passcode or if we are actively forcing a check
          setAuthError(data.message || 'Authentication failed');
        }
        setIsAuthenticated(false);
      }
    } catch (err) {
      if (code) setAuthError('Network error connecting to logs endpoint');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors(''); // Auto-attempt login using JWT on mount
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchErrors();
    }
  }, [filter]);

  const handleLogin = (e) => {
    e.preventDefault();
    fetchErrors(passcode);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { 'x-master-passcode': passcode, 'Authorization': `Bearer ${token}` } : { 'x-master-passcode': passcode };
  };

  const handleResolve = async (id) => {
    try {
      await fetch(`${baseURL}/errors/${id}/resolve`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      if (viewError && viewError.id === id) {
        setViewError({...viewError, is_resolved: 1});
      }
      fetchErrors();
    } catch (err) {
      alert('Failed to resolve error');
    }
  };

  const handleClearResolved = async () => {
    if (!window.confirm('Are you sure you want to delete all resolved errors?')) return;
    try {
      await fetch(`${baseURL}/errors/clear-resolved`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchErrors();
    } catch (err) {
      alert('Failed to clear resolved errors');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8 max-w-md w-full">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-red-500/20">
            <Terminal className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Developer Console</h1>
          <p className="text-slate-400 mb-8 text-sm">Enter the master passcode to access system logs and crash reports.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="password" 
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                placeholder="Enter Passcode"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all placeholder:text-slate-600 font-mono"
              />
            </div>
            {authError && <p className="text-red-400 text-sm">{authError}</p>}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-red-600/20 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldAlert className="w-5 h-5" />}
              Access Console
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-mono flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6 text-red-500" />
          <h1 className="text-xl font-bold text-white tracking-tight">System Error Logs</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 outline-none focus:border-red-500 text-slate-300"
          >
            <option value="unresolved">Unresolved Only</option>
            <option value="all">All Errors</option>
          </select>
          <button 
            onClick={() => fetchErrors()}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button 
            onClick={handleClearResolved}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Clear Resolved
          </button>
          <button onClick={() => { setIsAuthenticated(false); setPasscode(''); }} className="text-slate-500 hover:text-slate-300 ml-4">
            Exit Console
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex relative">
        {/* Error List */}
        <div className={`w-full ${viewError ? 'lg:w-1/3 border-r border-slate-800 hidden lg:flex' : 'flex'} flex-col overflow-y-auto bg-slate-900/50`}>
          {errors.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500">
              <CheckCircle2 className="w-12 h-12 mb-4 opacity-50 text-emerald-500" />
              <p>No errors found in this view.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {errors.map(err => (
                <div 
                  key={err.id} 
                  onClick={() => setViewError(err)}
                  className={`p-4 cursor-pointer hover:bg-slate-800 transition-colors ${viewError?.id === err.id ? 'bg-slate-800 border-l-2 border-red-500' : 'border-l-2 border-transparent'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 truncate max-w-[150px]">
                      {err.error_type}
                    </span>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {format(new Date(err.created_at), 'dd MMM HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 line-clamp-2 font-sans font-medium mb-2">{err.error_message}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {err.endpoint && <span className="flex items-center gap-1 truncate"><ExternalLink className="w-3 h-3 shrink-0" /> {err.endpoint}</span>}
                    {err.is_resolved ? <span className="text-emerald-500 flex items-center gap-1 shrink-0"><CheckCircle2 className="w-3 h-3" /> Resolved</span> : <span className="text-amber-500 flex items-center gap-1 shrink-0"><Activity className="w-3 h-3" /> Open</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Details Pane */}
        {viewError && (
          <div className="absolute inset-0 lg:static lg:flex-1 bg-slate-950 flex flex-col z-10">
            <div className="flex justify-between items-start p-6 border-b border-slate-800 bg-slate-900 shrink-0">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-white">{viewError.error_type}</h2>
                  {!viewError.is_resolved && (
                    <button onClick={() => handleResolve(viewError.id)} className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1 rounded-full font-bold transition-colors">
                      Mark Resolved
                    </button>
                  )}
                  {viewError.is_resolved && <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Resolved</span>}
                </div>
                <p className="text-slate-300 font-sans">{viewError.error_message}</p>
              </div>
              <button onClick={() => setViewError(null)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
              {/* Context Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-xs mb-1 flex items-center gap-1"><Server className="w-3 h-3" /> Endpoint</div>
                  <div className="text-slate-200 text-sm truncate" title={viewError.endpoint}>{viewError.method} {viewError.endpoint || 'N/A'}</div>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-xs mb-1 flex items-center gap-1"><Activity className="w-3 h-3" /> Time</div>
                  <div className="text-slate-200 text-sm">{format(new Date(viewError.created_at), 'dd MMM yyyy, HH:mm:ss')}</div>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-xs mb-1 flex items-center gap-1"><Smartphone className="w-3 h-3" /> Client IP</div>
                  <div className="text-slate-200 text-sm">{viewError.client_ip || 'N/A'}</div>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-xs mb-1 flex items-center gap-1"><Terminal className="w-3 h-3" /> User</div>
                  <div className="text-slate-200 text-sm truncate" title={viewError.user_name}>{viewError.user_name || `User ID: ${viewError.user_id || 'Guest'}`}</div>
                </div>
              </div>

              {/* Stack Trace */}
              {viewError.stack_trace && (
                <div>
                  <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Stack Trace</h3>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-x-auto">
                    <pre className="text-xs text-red-400 whitespace-pre-wrap leading-relaxed">{viewError.stack_trace}</pre>
                  </div>
                </div>
              )}

              {/* Additional Data */}
              {viewError.additional_data && (
                <div>
                  <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Additional Data</h3>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-x-auto">
                    <pre className="text-xs text-indigo-400 whitespace-pre-wrap leading-relaxed">
                      {JSON.stringify(JSON.parse(viewError.additional_data), null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DeveloperConsole;
