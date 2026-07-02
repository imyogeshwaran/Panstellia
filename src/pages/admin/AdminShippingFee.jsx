import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Truck, DollarSign, Save, RotateCcw, History, Loader2, Sparkles } from 'lucide-react';

export default function AdminShippingFee() {
  const { user } = useAuth();
  
  // Component states
  const [shippingSettings, setShippingSettings] = useState({
    shippingEnabled: true,
    freeShippingEnabled: true,
    shippingCharge: 49,
    freeShippingThreshold: 999,
    methods: {
      standard: {
        enabled: true,
        name: "Standard Shipping",
        description: "Surface Delivery",
        price: 49,
        deliveryTime: "Up to 7 Days"
      },
      premium: {
        enabled: true,
        name: "Premium Shipping",
        description: "Blue Dart Air",
        price: 129,
        deliveryTime: "2–4 Days"
      }
    }
  });
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load current settings & log history
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'ShippingSettings', 'config'));
        if (snap.exists()) {
          const data = snap.data();
          setShippingSettings({
            shippingEnabled: data.shippingEnabled ?? true,
            freeShippingEnabled: data.freeShippingEnabled ?? true,
            shippingCharge: Number(data.shippingCharge ?? 49),
            freeShippingThreshold: Number(data.freeShippingThreshold ?? 999),
            methods: {
              standard: {
                enabled: data.methods?.standard?.enabled !== false,
                name: data.methods?.standard?.name || "Standard Shipping",
                description: data.methods?.standard?.description || "Surface Delivery",
                price: Number(data.methods?.standard?.price !== undefined ? data.methods.standard.price : (data.shippingCharge ?? 49)),
                deliveryTime: data.methods?.standard?.deliveryTime || "Up to 7 Days"
              },
              premium: {
                enabled: data.methods?.premium?.enabled !== false,
                name: data.methods?.premium?.name || "Premium Shipping",
                description: data.methods?.premium?.description || "Blue Dart Air",
                price: Number(data.methods?.premium?.price ?? 129),
                deliveryTime: data.methods?.premium?.deliveryTime || "2–4 Days"
              }
            }
          });
        } else {
          // Admin auto-initializes settings document if it doesn't exist
          const configRef = doc(db, 'ShippingSettings', 'config');
          const defaultSettings = {
            shippingEnabled: true,
            freeShippingEnabled: true,
            shippingCharge: 49,
            freeShippingThreshold: 999,
            methods: {
              standard: {
                enabled: true,
                name: "Standard Shipping",
                description: "Surface Delivery",
                price: 49,
                deliveryTime: "Up to 7 Days"
              },
              premium: {
                enabled: true,
                name: "Premium Shipping",
                description: "Blue Dart Air",
                price: 129,
                deliveryTime: "2–4 Days"
              }
            },
            updatedBy: user?.email || 'System (Admin Init)',
            updatedAt: new Date().toISOString()
          };
          await setDoc(configRef, defaultSettings);
          setShippingSettings(defaultSettings);
        }
        await loadLogs();
      } catch (err) {
        console.error('Failed to load shipping settings:', err);
        toast.error('Error loading shipping settings');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const loadLogs = async () => {
    try {
      const q = query(
        collection(db, 'settings_history'),
        orderBy('changedAt', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const fetchedLogs = [];
      snap.forEach(d => {
        const item = d.data();
        if (item.module === 'shipping') {
          fetchedLogs.push({ id: d.id, ...item });
        }
      });
      setLogs(fetchedLogs);
    } catch (err) {
      console.error('Failed to load settings history:', err);
    }
  };

  const handleSave = async () => {
    // Validations
    if (shippingSettings.methods.standard.price < 0) {
      toast.error('Standard shipping price must be greater than or equal to 0');
      return;
    }
    if (shippingSettings.methods.premium.price < 0) {
      toast.error('Premium shipping price must be greater than or equal to 0');
      return;
    }
    if (shippingSettings.freeShippingThreshold < 0) {
      toast.error('Free shipping threshold must be greater than or equal to 0');
      return;
    }

    setSaving(true);
    try {
      const configRef = doc(db, 'ShippingSettings', 'config');
      const updatedData = {
        ...shippingSettings,
        shippingCharge: Number(shippingSettings.methods.standard.price), // sync for compatibility
        updatedBy: user?.email || 'Admin',
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(configRef, updatedData);

      // Add to history
      await addDoc(collection(db, 'settings_history'), {
        module: 'shipping',
        data: updatedData,
        changedBy: user?.email || 'Admin',
        changedAt: new Date().toISOString(),
        summary: `Updated settings: Std Price=₹${updatedData.methods.standard.price} (${updatedData.methods.standard.enabled ? 'Enabled' : 'Disabled'}), Prem Price=₹${updatedData.methods.premium.price} (${updatedData.methods.premium.enabled ? 'Enabled' : 'Disabled'}), Threshold=₹${updatedData.freeShippingThreshold}`
      });

      toast.success('Shipping settings updated successfully!');
      await loadLogs();
    } catch (err) {
      console.error('Failed to save shipping settings:', err);
      toast.error('Error saving shipping settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRollback = async (log) => {
    setSaving(true);
    try {
      const { data } = log;
      const configRef = doc(db, 'ShippingSettings', 'config');
      
      const rollbackData = {
        shippingEnabled: data.shippingEnabled ?? true,
        freeShippingEnabled: data.freeShippingEnabled ?? true,
        shippingCharge: Number(data.methods?.standard?.price !== undefined ? data.methods.standard.price : (data.shippingCharge ?? 49)),
        freeShippingThreshold: Number(data.freeShippingThreshold ?? 999),
        methods: {
          standard: {
            enabled: data.methods?.standard?.enabled !== false,
            name: data.methods?.standard?.name || "Standard Shipping",
            description: data.methods?.standard?.description || "Surface Delivery",
            price: Number(data.methods?.standard?.price !== undefined ? data.methods.standard.price : (data.shippingCharge ?? 49)),
            deliveryTime: data.methods?.standard?.deliveryTime || "Up to 7 Days"
          },
          premium: {
            enabled: data.methods?.premium?.enabled !== false,
            name: data.methods?.premium?.name || "Premium Shipping",
            description: data.methods?.premium?.description || "Blue Dart Air",
            price: Number(data.methods?.premium?.price ?? 129),
            deliveryTime: data.methods?.premium?.deliveryTime || "2–4 Days"
          }
        },
        updatedBy: user?.email || 'Admin',
        updatedAt: new Date().toISOString()
      };

      await setDoc(configRef, rollbackData);
      setShippingSettings(rollbackData);

      // Add rollback action to history logs
      await addDoc(collection(db, 'settings_history'), {
        module: 'shipping',
        data: rollbackData,
        changedBy: user?.email || 'Admin',
        changedAt: new Date().toISOString(),
        summary: `Rolled back shipping settings to version from ${new Date(log.changedAt).toLocaleString()}`
      });

      toast.success('Successfully rolled back shipping settings!');
      await loadLogs();
    } catch (err) {
      console.error('Rollback failed:', err);
      toast.error('Failed to perform rollback');
    } finally {
      setSaving(false);
    }
  };

  const handleMethodChange = (methodKey, field, value) => {
    setShippingSettings(prev => ({
      ...prev,
      methods: {
        ...prev.methods,
        [methodKey]: {
          ...prev.methods[methodKey],
          [field]: value
        }
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold text-luxury-900 flex items-center gap-2">
          <Truck className="w-8 h-8 text-gold-650" />
          Shipping Settings Control Panel
        </h1>
        <p className="text-sm text-luxury-500 mt-1">
          Dynamically configure names, descriptions, prices, and status parameters for Standard and Premium delivery options.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Configuration Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Toggles Card */}
          <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md space-y-6">
            <h3 className="text-base font-bold text-luxury-900 border-b border-luxury-100 pb-3">Master Rules</h3>
            
            {/* Toggle 1: Enable Shipping Charges */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-luxury-900">Enable Shipping System</p>
                <p className="text-xs text-luxury-500 mt-0.5">
                  If disabled, shipping will be free for all orders across the checkout.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={shippingSettings.shippingEnabled}
                  onChange={(e) => setShippingSettings({
                    ...shippingSettings,
                    shippingEnabled: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-luxury-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
              </label>
            </div>

            {/* Toggle 2: Free Shipping Threshold */}
            <div className="flex items-center justify-between pt-4 border-t border-luxury-50">
              <div>
                <p className="text-sm font-bold text-luxury-900">Enable Free Shipping Threshold</p>
                <p className="text-xs text-luxury-500 mt-0.5">
                  Unlock free Standard shipping when cart total hits the configured minimum threshold value.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={shippingSettings.freeShippingEnabled}
                  disabled={!shippingSettings.shippingEnabled}
                  onChange={(e) => setShippingSettings({
                    ...shippingSettings,
                    freeShippingEnabled: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                  shippingSettings.shippingEnabled 
                    ? 'bg-luxury-200 peer-checked:bg-gold-500 cursor-pointer' 
                    : 'bg-luxury-100 opacity-50 cursor-not-allowed'
                }`}></div>
              </label>
            </div>
            
            {shippingSettings.freeShippingEnabled && shippingSettings.shippingEnabled && (
              <div className="pt-4 border-t border-luxury-50">
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">
                  Free Shipping Minimum Threshold (₹)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-luxury-400 font-bold">₹</div>
                  <input
                    type="number"
                    value={shippingSettings.freeShippingThreshold}
                    onChange={(e) => setShippingSettings({
                      ...shippingSettings,
                      freeShippingThreshold: Math.max(0, parseInt(e.target.value) || 0)
                    })}
                    className="w-full pl-8 input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                    min="0"
                  />
                </div>
                <p className="text-[11px] text-luxury-400 mt-1">Customers shopping at or above this cart value get standard shipping free.</p>
              </div>
            )}
          </div>

          {/* Dynamic Methods Configurations */}
          <div className="space-y-6">
            
            {/* Standard Shipping Config Card */}
            <div className={`bg-white rounded-2xl p-6 border shadow-md space-y-4 transition-all ${
              shippingSettings.methods.standard.enabled ? 'border-luxury-100' : 'border-red-100 bg-red-50/5'
            }`}>
              <div className="flex items-center justify-between border-b border-luxury-100 pb-3">
                <h3 className="text-base font-bold text-luxury-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                  Standard Shipping Option Settings
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shippingSettings.methods.standard.enabled}
                    disabled={!shippingSettings.shippingEnabled}
                    onChange={(e) => handleMethodChange('standard', 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-luxury-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold-500"></div>
                </label>
              </div>

              {shippingSettings.methods.standard.enabled && shippingSettings.shippingEnabled ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-luxury-600 uppercase mb-1.5">Option Display Name</label>
                    <input
                      type="text"
                      value={shippingSettings.methods.standard.name}
                      onChange={(e) => handleMethodChange('standard', 'name', e.target.value)}
                      className="w-full input-field p-2.5 text-sm border rounded-lg"
                      placeholder="e.g. Standard Shipping"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-luxury-600 uppercase mb-1.5">Carrier / Short Description</label>
                    <input
                      type="text"
                      value={shippingSettings.methods.standard.description}
                      onChange={(e) => handleMethodChange('standard', 'description', e.target.value)}
                      className="w-full input-field p-2.5 text-sm border rounded-lg"
                      placeholder="e.g. Surface Courier"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-luxury-600 uppercase mb-1.5">Flat Price (₹)</label>
                    <input
                      type="number"
                      value={shippingSettings.methods.standard.price}
                      onChange={(e) => handleMethodChange('standard', 'price', Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full input-field p-2.5 text-sm border rounded-lg"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-luxury-600 uppercase mb-1.5">Estimated Delivery Time (ETA)</label>
                    <input
                      type="text"
                      value={shippingSettings.methods.standard.deliveryTime}
                      onChange={(e) => handleMethodChange('standard', 'deliveryTime', e.target.value)}
                      className="w-full input-field p-2.5 text-sm border rounded-lg"
                      placeholder="e.g. 5-7 Days"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-red-500 italic">Standard shipping is disabled and won't show up in storefront checkout.</p>
              )}
            </div>

            {/* Premium Shipping Config Card */}
            <div className={`bg-white rounded-2xl p-6 border shadow-md space-y-4 transition-all ${
              shippingSettings.methods.premium.enabled ? 'border-luxury-100' : 'border-red-100 bg-red-50/5'
            }`}>
              <div className="flex items-center justify-between border-b border-luxury-100 pb-3">
                <h3 className="text-base font-bold text-luxury-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
                  Premium Shipping Option Settings
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shippingSettings.methods.premium.enabled}
                    disabled={!shippingSettings.shippingEnabled}
                    onChange={(e) => handleMethodChange('premium', 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-luxury-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold-500"></div>
                </label>
              </div>

              {shippingSettings.methods.premium.enabled && shippingSettings.shippingEnabled ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-luxury-600 uppercase mb-1.5">Option Display Name</label>
                    <input
                      type="text"
                      value={shippingSettings.methods.premium.name}
                      onChange={(e) => handleMethodChange('premium', 'name', e.target.value)}
                      className="w-full input-field p-2.5 text-sm border rounded-lg"
                      placeholder="e.g. Premium Express Delivery"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-luxury-600 uppercase mb-1.5">Carrier / Short Description</label>
                    <input
                      type="text"
                      value={shippingSettings.methods.premium.description}
                      onChange={(e) => handleMethodChange('premium', 'description', e.target.value)}
                      className="w-full input-field p-2.5 text-sm border rounded-lg"
                      placeholder="e.g. Blue Dart Air"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-luxury-600 uppercase mb-1.5">Flat Price (₹)</label>
                    <input
                      type="number"
                      value={shippingSettings.methods.premium.price}
                      onChange={(e) => handleMethodChange('premium', 'price', Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full input-field p-2.5 text-sm border rounded-lg"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-luxury-600 uppercase mb-1.5">Estimated Delivery Time (ETA)</label>
                    <input
                      type="text"
                      value={shippingSettings.methods.premium.deliveryTime}
                      onChange={(e) => handleMethodChange('premium', 'deliveryTime', e.target.value)}
                      className="w-full input-field p-2.5 text-sm border rounded-lg"
                      placeholder="e.g. 2-4 Days"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-red-500 italic">Premium shipping is disabled and won't show up in storefront checkout.</p>
              )}
            </div>

          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary py-3 px-8 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Shipping Settings
            </button>
          </div>
        </div>

        {/* Dynamic Business Cases Checker Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-luxury-900 text-gold-100 rounded-2xl p-6 shadow-md border border-luxury-800">
            <h3 className="text-sm font-serif font-bold uppercase tracking-wider mb-4 border-b border-luxury-800 pb-2">Rule Preview</h3>
            
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-luxury-400 block mb-0.5">Status:</span>
                <span className="font-bold">
                  {shippingSettings.shippingEnabled ? 'Active Custom Rules' : 'Free Shipping for All (Disabled)'}
                </span>
              </div>

              {shippingSettings.shippingEnabled && (
                <div className="space-y-3">
                  {shippingSettings.methods.standard.enabled && (
                    <div>
                      <span className="text-luxury-400 block mb-0.5">Standard:</span>
                      <p className="leading-relaxed text-luxury-200">
                        {shippingSettings.methods.standard.name} ({shippingSettings.methods.standard.description}):{' '}
                        <span className="text-white font-bold">₹{shippingSettings.methods.standard.price}</span>.
                      </p>
                      {shippingSettings.freeShippingEnabled && (
                        <p className="leading-relaxed mt-0.5 text-gold-400">
                          Free at or above ₹{shippingSettings.freeShippingThreshold}.
                        </p>
                      )}
                    </div>
                  )}

                  {shippingSettings.methods.premium.enabled && (
                    <div>
                      <span className="text-luxury-400 block mb-0.5">Premium:</span>
                      <p className="leading-relaxed text-luxury-200">
                        {shippingSettings.methods.premium.name} ({shippingSettings.methods.premium.description}):{' '}
                        <span className="text-white font-bold">₹{shippingSettings.methods.premium.price}</span>.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-luxury-800">
                <span className="text-luxury-400 block mb-2 font-bold uppercase tracking-widest text-[10px]">Active Cases Preview:</span>
                <ul className="space-y-2 leading-relaxed text-luxury-300">
                  <li className="flex justify-between border-b border-luxury-800/40 pb-1">
                    <span>Cart ₹250 (Std)</span>
                    <span className="font-bold text-white">
                      {!shippingSettings.shippingEnabled ? 'Free' : (!shippingSettings.methods.standard.enabled ? 'N/A' : `₹${shippingSettings.methods.standard.price}`)}
                    </span>
                  </li>
                  <li className="flex justify-between border-b border-luxury-800/40 pb-1">
                    <span>Cart ₹250 (Prem)</span>
                    <span className="font-bold text-white">
                      {!shippingSettings.shippingEnabled ? 'Free' : (!shippingSettings.methods.premium.enabled ? 'N/A' : `₹${shippingSettings.methods.premium.price}`)}
                    </span>
                  </li>
                  <li className="flex justify-between border-b border-luxury-800/40 pb-1">
                    <span>Cart ₹{shippingSettings.freeShippingThreshold} (Std)</span>
                    <span className="font-bold text-white">
                      {!shippingSettings.shippingEnabled ? 'Free' : (!shippingSettings.methods.standard.enabled ? 'N/A' : (shippingSettings.freeShippingEnabled ? 'Free' : `₹${shippingSettings.methods.standard.price}`))}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Cart ₹{shippingSettings.freeShippingThreshold} (Prem)</span>
                    <span className="font-bold text-white">
                      {!shippingSettings.shippingEnabled ? 'Free' : (!shippingSettings.methods.premium.enabled ? 'N/A' : `₹${shippingSettings.methods.premium.price}`)}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Log Section */}
      <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-gold-650" />
          <h3 className="text-base font-bold text-luxury-900">Shipping Change History</h3>
        </div>
        <p className="text-xs text-luxury-500 mb-6">
          Review shipping settings history and rollback configurations instantly.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-luxury-200 text-xs font-bold text-luxury-600 uppercase tracking-wider bg-luxury-50/50">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Changed By</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-luxury-100 text-sm">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-luxury-50/30">
                  <td className="py-3.5 px-4 font-mono text-xs text-luxury-800">
                    {new Date(log.changedAt).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-luxury-600">{log.changedBy}</td>
                  <td className="py-3.5 px-4 text-luxury-500 max-w-sm truncate">{log.summary}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleRollback(log)}
                      disabled={saving}
                      className="btn-secondary py-1 px-3 text-xs flex items-center gap-1 ml-auto disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Rollback
                    </button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-luxury-400">
                    No change records found. Saving updates will create new log items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
