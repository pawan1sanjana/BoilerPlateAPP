import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Shield, Mail, Lock, User, Camera, RefreshCw, Phone, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSecurityPolicyStore } from '@/store/useSecurityPolicyStore';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
import { isAdmin, canManageUsers, canAccessEstate, getRoleOptions } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';

export default function AccountEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentProfile = useAuthStore(s => s.profile);
  const currentRole = currentProfile?.role as AppRole | null;
  const canManage = canManageUsers(currentRole);
  const roleOptions = getRoleOptions(currentRole);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scopeBlocked, setScopeBlocked] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '', // Left blank unless they want to change
    role: 'user',
    profile_photo: '',
    status: 'active'
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available. Please access the app via localhost or HTTPS.");
      }
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
      setCameraActive(true);
    } catch (err: any) {
      setError(err.message || 'Could not access camera. Please check permissions.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setFormData(prev => ({ ...prev, profile_photo: dataUrl }));
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!id) return;
        
        // Fetch user from public.users table
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;

        if (data) {
          // Scope check: non-admin users can only edit users in their own estate
          if (!isAdmin(currentRole) && !canAccessEstate(currentRole, currentProfile?.estate_id, data.estate_id)) {
            setScopeBlocked(true);
            setLoading(false);
            return;
          }
          // Non-managers cannot edit at all
          if (!canManage) {
            setScopeBlocked(true);
            setLoading(false);
            return;
          }

          setFormData({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            role: data.role || 'user',
            password: '',
            profile_photo: '',
            status: data.status || 'active'
          });
        }
      } catch (err: any) {
        setError('Failed to fetch user context: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id, currentRole, currentProfile?.estate_id, canManage]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password) {
      const minLen = useSecurityPolicyStore.getState().policy.minPasswordLength;
      if (formData.password.length < minLen) {
        setError(`Password must be at least ${minLen} characters long`);
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      if (!id) throw new Error('No user ID provided');

      // Note: Updating auth.users (email, password) for other users requires admin privileges
      // Here we update the public.users table which has RLS policies
      
      const updatePayload: any = {
        name: formData.name,
        role: formData.role,
        phone: formData.phone
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', id);

      if (updateError) throw updateError;

      if (formData.password) {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('update-user-password', {
          body: {
            userId: id,
            password: formData.password
          }
        });

        if (fnError || fnData?.error) {
          const msg = fnData?.error || fnError?.message || 'Failed to update password';
          throw new Error(msg);
        }
      }

      toast.success('User updated successfully');
      navigate('/accounts'); // Or navigate to /dashboard
    } catch (err: any) {
      setError(err.message || 'An error occurred during update.');
      toast.error('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-slate-500">Loading user profile...</div>
      </div>
    );
  }

  if (scopeBlocked) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-4">
        <Shield className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access Restricted</h2>
        <p className="text-slate-500 dark:text-slate-400">
          You don't have permission to edit this user account.
        </p>
        <Link to="/accounts" className="text-sm text-blue-500 hover:underline">
          ← Back to Accounts
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/accounts" className="p-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Edit className="w-6 h-6 text-blue-500" /> Edit User Profile
          </h1>
        </div>
        <div className="ml-auto">
          {formData.status === 'active' && (
            <button
              onClick={async (e) => {
                e.preventDefault();
                if (window.confirm('This will instantly terminate all active sessions for this user. Proceed?')) {
                  try {
                    const { error } = await supabase.rpc('force_logout_user', { target_user_id: id });
                    if (error) throw error;
                    toast.success('User has been force logged out');
                  } catch (err) {
                    console.error(err);
                    toast.error('Failed to force logout user');
                  }
                }
              }}
              className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-400 font-medium rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm"
            >
              <LogOut size={16} />
              Force Logout
            </button>
          )}
        </div>
      </div>

      <Card className="rounded-3xl border-slate-200 dark:border-slate-800">
        <CardContent className="p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium text-sm border border-red-200 dark:border-red-800/50">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Capture Section */}
            <div className="flex flex-col items-center gap-4 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="relative w-40 h-40 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-xl ring-2 ring-blue-500/20">
                {formData.profile_photo ? (
                  <img src={formData.profile_photo} alt="Preview" className="w-full h-full object-cover" />
                ) : cameraActive ? (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <User size={64} />
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex gap-2">
                {!cameraActive && !formData.profile_photo ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2 text-sm font-semibold"
                  >
                    <Camera size={18} /> Enable Camera
                  </button>
                ) : cameraActive ? (
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all flex items-center gap-2 text-sm font-semibold shadow-lg shadow-blue-500/20"
                  >
                    <Camera size={18} /> Capture Photo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setFormData(prev => ({ ...prev, profile_photo: '' })); startCamera(); }}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2 text-sm font-semibold"
                  >
                    <RefreshCw size={18} /> Edit Photo
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address (Read Only)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      name="email"
                      disabled
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-slate-500 dark:text-slate-400 transition-all shadow-sm cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Role</label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-all shadow-sm appearance-none"
                      >
                        {roleOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Update Password <span className="text-xs font-normal text-slate-500">(Leave blank)</span></label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      name="password"
                      minLength={6}
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-all shadow-sm"
                      placeholder="Enter new password"
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="pt-6 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
              <Link to="/accounts" className="px-6 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-semibold">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-500/30 flex items-center gap-2"
              >
                <Edit size={18} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
