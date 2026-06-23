'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { CreatorService } from '@/services/creatorService';
import { CountryService } from '@/services/countryService';
import { PaymentMethodService } from '@/services/paymentMethodService';
import { PaymentScheduleService } from '@/services/paymentScheduleService';
import { CurrencyService } from '@/services/currencyService';
import { Country } from '@/types/creator';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { Payment } from '@/types/book';
import { PayoutService, calculatePayoutStats } from '@/services/payoutService';
import { getNextPayoutDate, formatDate, formatCurrency, getPayoutStatusColor, getPaymentTypeLabel, getDaysUntil, formatDateRange } from '@/utils/payoutUtils';
import {
  UserCircleIcon,
  Cog6ToothIcon,
  BellIcon,
  CreditCardIcon,
  PaintBrushIcon,
  BanknotesIcon,
  CalendarIcon,
  ChartBarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type Tab = 'profile' | 'account' | 'notifications' | 'payment' | 'preferences';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { setPageTitle } = usePageTitle();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);

  // Set page title
  useEffect(() => {
    setPageTitle('Settings', 'Manage your account preferences');
  }, [setPageTitle]);

  // Profile state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    bio: '',
    penName: '',
    authorBio: '',
    website: '',
    twitter: '',
    linkedin: '',
    instagram: '',
    facebook: '',
  });

  // Account state
  const [accountData, setAccountData] = useState({
    country: '',
    timezone: '',
    language: '',
    currency: '',      // Currency code for backwards compat
    currency_id: '',   // Document ID reference to supported_currencies
  });

  // Notification state
  const [notificationData, setNotificationData] = useState({
    emailMarketing: true,
    salesUpdates: true,
    platformUpdates: true,
    weeklyDigest: false,
  });

  // Payment state
  const [paymentData, setPaymentData] = useState({
    payment_option: '', // Document ID from payment_methods collection
    payout_schedule: '', // Document ID from payment_schedules collection
    payment_details: {
      bank_name: '',
      branch_name: '',
      account_name: '',
      account_number: '',
      provider: '',
    }
  });

  // Payment methods from Firestore
  const [paymentMethods, setPaymentMethods] = useState<Array<{id: string, display_name: string}>>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);

  // Payment schedules from Firestore
  const [paymentSchedules, setPaymentSchedules] = useState<Array<{id: string, display_name: string, description: string, value: string, sort_order: number}>>([]);
  const [loadingPaymentSchedules, setLoadingPaymentSchedules] = useState(true);
  const [selectedScheduleDescription, setSelectedScheduleDescription] = useState('');

  // Supported currencies from Firestore
  const [supportedCurrencies, setSupportedCurrencies] = useState<Array<{id: string, currency_code: string, display_name: string, symbol: string, payout_threshold: number, is_active: boolean, sort_order: number}>>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);

  // Payout threshold state
  const [payoutThreshold, setPayoutThreshold] = useState<number>(0);
  const [payoutCurrency, setPayoutCurrency] = useState<string>('GHS');

  // Preferences state
  const [preferencesData, setPreferencesData] = useState({
    theme: 'light',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  });

  // Payout state
  const [payoutHistory, setPayoutHistory] = useState<Payment[]>([]);
  const [payoutStats, setPayoutStats] = useState({
    pendingBalance: 0,
    nextPayoutDate: '',
    nextPayoutAmount: 0,
    totalEarnings: 0,
    lifetimePayouts: 0,
  });
  const [selectedPayout, setSelectedPayout] = useState<Payment | null>(null);
  const [showPayoutDetails, setShowPayoutDetails] = useState(false);

  // Helper to determine which payment method type based on display_name
  const getPaymentMethodType = (paymentOptionId: string): 'bank' | 'mobile' | null => {
    const method = paymentMethods.find(m => m.id === paymentOptionId);
    if (!method) return null;
    
    const displayName = method.display_name.toLowerCase();
    if (displayName.includes('bank') || displayName.includes('account')) {
      return 'bank';
    } else if (displayName.includes('mobile')) {
      return 'mobile';
    }
    return null;
  };

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [countriesData] = await Promise.all([
        CountryService.getCountries(),
      ]);

      setCountries(countriesData);

      // Fetch full user document from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const data = userDocSnap.exists() ? userDocSnap.data() : {};

      // Profile data
      setProfileData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        displayName: data.displayName || user.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        bio: data.bio || '',
        penName: data.penName || '',
        authorBio: data.authorBio || '',
        website: data.website || '',
        twitter: data.socialLinks?.twitter || '',
        linkedin: data.socialLinks?.linkedin || '',
        instagram: data.socialLinks?.instagram || '',
        facebook: data.socialLinks?.facebook || '',
      });

      // Account data
      setAccountData({
        country: data.country || data.countryOfResidence || '',
        timezone: data.timezone || 'UTC',
        language: data.language || 'en',
        currency: data.currency || user.currency || 'GHS',
        currency_id: data.currency_id || '',
      });

      // Notification data
      setNotificationData({
        emailMarketing: data.notificationSettings?.emailMarketing ?? true,
        salesUpdates: data.notificationSettings?.salesUpdates ?? true,
        platformUpdates: data.notificationSettings?.platformUpdates ?? true,
        weeklyDigest: data.notificationSettings?.weeklyDigest ?? false,
      });

      // Payment data
      setPaymentData({
        payment_option: data.paymentInfo?.payment_option || '',
        payout_schedule: data.paymentInfo?.payout_schedule || '',
        payment_details: {
          bank_name: data.paymentInfo?.payment_details?.bank_name || '',
          branch_name: data.paymentInfo?.payment_details?.branch_name || '',
          account_name: data.paymentInfo?.payment_details?.account_name || '',
          account_number: data.paymentInfo?.payment_details?.account_number || '',
          provider: data.paymentInfo?.payment_details?.provider || '',
        }
      });

      // Preferences data
      setPreferencesData({
        theme: data.preferences?.theme || data.theme || 'light',
        dateFormat: data.preferences?.dateFormat || data.dateFormat || 'MM/DD/YYYY',
        timeFormat: data.preferences?.timeFormat || data.timeFormat || '12h',
      });

      // Load payout data (aggregated from real purchases)
      const userCurrency = data.currency || user.currency || 'GHS';
      const payouts = await PayoutService.getPayoutHistory(user.uid, userCurrency);
      setPayoutHistory(payouts);

      const stats = calculatePayoutStats(payouts);
      const nextPayoutDate = getNextPayoutDate();
      
      setPayoutStats({
        ...stats,
        nextPayoutDate: formatDate(nextPayoutDate, 'long'),
      });
    } catch (error) {
      console.error('Error loading settings data:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    } else if (user) {
      loadData();
    }
  }, [user, authLoading, router, loadData]);

  // Fetch payment methods from Firestore
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const methods = await PaymentMethodService.getPaymentMethods();
        setPaymentMethods(methods);
      } catch (error) {
        console.error('Error fetching payment methods:', error);
        toast.error('Failed to load payment methods');
      } finally {
        setLoadingPaymentMethods(false);
      }
    };
    
    fetchPaymentMethods();
  }, []);

  // Fetch payment schedules from Firestore
  useEffect(() => {
    const fetchPaymentSchedules = async () => {
      try {
        const schedules = await PaymentScheduleService.getPaymentSchedules();
        setPaymentSchedules(schedules);
        
        // Set initial description if schedule is already selected
        if (paymentData.payout_schedule) {
          const selected = schedules.find(s => s.id === paymentData.payout_schedule);
          if (selected) {
            setSelectedScheduleDescription(selected.description);
          }
        }
      } catch (error) {
        console.error('Error fetching payment schedules:', error);
        toast.error('Failed to load payment schedules');
      } finally {
        setLoadingPaymentSchedules(false);
      }
    };
    
    fetchPaymentSchedules();
  }, [paymentData.payout_schedule]);

  // Fetch supported currencies from Firestore
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const currencies = await CurrencyService.getSupportedCurrencies();
        setSupportedCurrencies(currencies);
      } catch (error) {
        console.error('Error fetching currencies:', error);
        toast.error('Failed to load currencies');
      } finally {
        setLoadingCurrencies(false);
      }
    };
    
    fetchCurrencies();
  }, []);

  // Fetch payout threshold when currency_id changes
  useEffect(() => {
    const fetchPayoutThreshold = async () => {
      if (accountData.currency_id) {
        const currencyDetails = await CurrencyService.getCurrencyById(accountData.currency_id);
        if (currencyDetails) {
          setPayoutThreshold(currencyDetails.payout_threshold);
          setPayoutCurrency(currencyDetails.currency_code);
        }
      }
    };
    
    fetchPayoutThreshold();
  }, [accountData.currency_id]);

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setSaving(true);
      await CreatorService.updateProfile(user.uid, {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        displayName: profileData.displayName,
        bio: profileData.bio,
        penName: profileData.penName,
        authorBio: profileData.authorBio,
        website: profileData.website,
        socialLinks: {
          twitter: profileData.twitter || undefined,
          linkedin: profileData.linkedin || undefined,
          instagram: profileData.instagram || undefined,
          facebook: profileData.facebook || undefined,
        },
      });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!user) return;

    try {
      setSaving(true);
      await CreatorService.updateAccountSettings(user.uid, accountData);
      toast.success('Account settings updated successfully');
    } catch (error) {
      console.error('Error saving account settings:', error);
      toast.error('Failed to update account settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;

    try {
      setSaving(true);
      await CreatorService.updateNotificationSettings(user.uid, notificationData);
      toast.success('Notification settings updated successfully');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to update notification settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayment = async () => {
    if (!user) return;

    try {
      setSaving(true);
      await CreatorService.updatePaymentInfo(user.uid, {
        payment_option: paymentData.payment_option,
        payout_schedule: paymentData.payout_schedule,
        payment_details: paymentData.payment_details,
      });
      toast.success('Payment information updated successfully');
    } catch (error) {
      console.error('Error saving payment info:', error);
      toast.error('Failed to update payment information');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;

    try {
      setSaving(true);
      await CreatorService.updatePreferences(user.uid, preferencesData);
      toast.success('Preferences updated successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile' as Tab, name: 'Profile', icon: UserCircleIcon },
    { id: 'account' as Tab, name: 'Account', icon: Cog6ToothIcon },
    { id: 'notifications' as Tab, name: 'Notifications', icon: BellIcon },
    { id: 'payment' as Tab, name: 'Payment', icon: CreditCardIcon },
    { id: 'preferences' as Tab, name: 'Preferences', icon: PaintBrushIcon },
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-x-hidden">
      <div className="w-full mx-auto px-3 sm:px-4 lg:px-6 py-4">
        <div className="mt-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="lg:w-64 flex-shrink-0">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900">Profile Information</h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={profileData.firstName}
                          onChange={(e) =>
                            setProfileData({ ...profileData, firstName: e.target.value })
                          }
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={profileData.lastName}
                          onChange={(e) =>
                            setProfileData({ ...profileData, lastName: e.target.value })
                          }
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={profileData.displayName}
                          onChange={(e) =>
                            setProfileData({ ...profileData, displayName: e.target.value })
                          }
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pen Name
                        </label>
                        <input
                          type="text"
                          value={profileData.penName}
                          onChange={(e) =>
                            setProfileData({ ...profileData, penName: e.target.value })
                          }
                          className="input-field"
                          placeholder="Optional"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bio
                        </label>
                        <textarea
                          value={profileData.bio}
                          onChange={(e) =>
                            setProfileData({ ...profileData, bio: e.target.value })
                          }
                          rows={4}
                          className="input-field"
                          placeholder="Tell us about yourself..."
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Author Bio
                        </label>
                        <textarea
                          value={profileData.authorBio}
                          onChange={(e) =>
                            setProfileData({ ...profileData, authorBio: e.target.value })
                          }
                          rows={4}
                          className="input-field"
                          placeholder="Your author biography..."
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Website
                        </label>
                        <input
                          type="url"
                          value={profileData.website}
                          onChange={(e) =>
                            setProfileData({ ...profileData, website: e.target.value })
                          }
                          className="input-field"
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">Social Links</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <input
                            type="text"
                            value={profileData.twitter}
                            onChange={(e) =>
                              setProfileData({ ...profileData, twitter: e.target.value })
                            }
                            className="input-field"
                            placeholder="Twitter handle"
                          />
                          <input
                            type="text"
                            value={profileData.linkedin}
                            onChange={(e) =>
                              setProfileData({ ...profileData, linkedin: e.target.value })
                            }
                            className="input-field"
                            placeholder="LinkedIn URL"
                          />
                          <input
                            type="text"
                            value={profileData.instagram}
                            onChange={(e) =>
                              setProfileData({ ...profileData, instagram: e.target.value })
                            }
                            className="input-field"
                            placeholder="Instagram handle"
                          />
                          <input
                            type="text"
                            value={profileData.facebook}
                            onChange={(e) =>
                              setProfileData({ ...profileData, facebook: e.target.value })
                            }
                            className="input-field"
                            placeholder="Facebook page"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-gray-200">
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="btn-primary disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Account Tab */}
                {activeTab === 'account' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900">Account Settings</h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Country
                        </label>
                        <select
                          value={accountData.country}
                          onChange={(e) =>
                            setAccountData({ ...accountData, country: e.target.value })
                          }
                          className="select-field"
                        >
                          <option value="">Select country</option>
                          {countries.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Timezone
                        </label>
                        <select
                          value={accountData.timezone}
                          onChange={(e) =>
                            setAccountData({ ...accountData, timezone: e.target.value })
                          }
                          className="select-field"
                        >
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                          <option value="Europe/London">London</option>
                          <option value="Europe/Paris">Paris</option>
                          <option value="Asia/Tokyo">Tokyo</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Language
                        </label>
                        <select
                          value={accountData.language}
                          onChange={(e) =>
                            setAccountData({ ...accountData, language: e.target.value })
                          }
                          className="select-field"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                          <option value="it">Italian</option>
                          <option value="pt">Portuguese</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Currency
                        </label>
                        <select
                          value={accountData.currency_id}
                          onChange={(e) => {
                            const currencyId = e.target.value;
                            const selected = supportedCurrencies.find(c => c.id === currencyId);
                            setAccountData({
                              ...accountData,
                              currency_id: currencyId,
                              currency: selected?.currency_code || ''
                            });
                          }}
                          className="select-field"
                          disabled={loadingCurrencies}
                        >
                          <option value="">Select currency...</option>
                          {supportedCurrencies.map((curr) => (
                            <option key={curr.id} value={curr.id}>
                              {curr.display_name} ({curr.symbol})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-gray-200">
                      <button
                        onClick={handleSaveAccount}
                        disabled={saving}
                        className="btn-primary disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900">Notification Preferences</h3>
                    <div className="space-y-4">
                      <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div>
                          <div className="font-medium text-gray-900">Email Marketing</div>
                          <div className="text-sm text-gray-500">
                            Receive updates about new features and promotions
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationData.emailMarketing}
                          onChange={(e) =>
                            setNotificationData({
                              ...notificationData,
                              emailMarketing: e.target.checked,
                            })
                          }
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </label>
                      <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div>
                          <div className="font-medium text-gray-900">Sales Updates</div>
                          <div className="text-sm text-gray-500">
                            Get notified when you make a sale
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationData.salesUpdates}
                          onChange={(e) =>
                            setNotificationData({
                              ...notificationData,
                              salesUpdates: e.target.checked,
                            })
                          }
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </label>
                      <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div>
                          <div className="font-medium text-gray-900">Platform Updates</div>
                          <div className="text-sm text-gray-500">
                            Important announcements and system updates
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationData.platformUpdates}
                          onChange={(e) =>
                            setNotificationData({
                              ...notificationData,
                              platformUpdates: e.target.checked,
                            })
                          }
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </label>
                      <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div>
                          <div className="font-medium text-gray-900">Weekly Digest</div>
                          <div className="text-sm text-gray-500">
                            Weekly summary of your book performance
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationData.weeklyDigest}
                          onChange={(e) =>
                            setNotificationData({
                              ...notificationData,
                              weeklyDigest: e.target.checked,
                            })
                          }
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </label>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-gray-200">
                      <button
                        onClick={handleSaveNotifications}
                        disabled={saving}
                        className="btn-primary disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Payment Tab */}
                {activeTab === 'payment' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900">Payment Information</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Method
                        </label>
                        <select
                          value={paymentData.payment_option}
                          onChange={(e) => {
                            const newPaymentOption = e.target.value;
                            // Clear payment details when switching payment methods
                            setPaymentData({
                              ...paymentData,
                              payment_option: newPaymentOption,
                              payment_details: {
                                bank_name: '',
                                branch_name: '',
                                account_name: '',
                                account_number: '',
                                provider: '',
                              }
                            });
                          }}
                          className="select-field"
                          disabled={loadingPaymentMethods}
                        >
                          <option value="">Select payment method...</option>
                          {paymentMethods.map((method) => (
                            <option key={method.id} value={method.id}>
                              {method.display_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Bank Account Details */}
                      {getPaymentMethodType(paymentData.payment_option) === 'bank' && (
                        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <h4 className="text-sm font-medium text-gray-900">Bank Account Details</h4>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Bank Name
                            </label>
                            <input
                              type="text"
                              value={paymentData.payment_details.bank_name}
                              onChange={(e) =>
                                setPaymentData({
                                  ...paymentData,
                                  payment_details: { ...paymentData.payment_details, bank_name: e.target.value }
                                })
                              }
                              className="input-field"
                              placeholder="Enter bank name"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Branch Name
                            </label>
                            <input
                              type="text"
                              value={paymentData.payment_details.branch_name}
                              onChange={(e) =>
                                setPaymentData({
                                  ...paymentData,
                                  payment_details: { ...paymentData.payment_details, branch_name: e.target.value }
                                })
                              }
                              className="input-field"
                              placeholder="Enter branch name"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Account Name
                            </label>
                            <input
                              type="text"
                              value={paymentData.payment_details.account_name}
                              onChange={(e) =>
                                setPaymentData({
                                  ...paymentData,
                                  payment_details: { ...paymentData.payment_details, account_name: e.target.value }
                                })
                              }
                              className="input-field"
                              placeholder="Enter account holder name"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Account Number
                            </label>
                            <input
                              type="text"
                              value={paymentData.payment_details.account_number}
                              onChange={(e) =>
                                setPaymentData({
                                  ...paymentData,
                                  payment_details: { ...paymentData.payment_details, account_number: e.target.value }
                                })
                              }
                              className="input-field"
                              placeholder="Enter account number"
                            />
                          </div>
                        </div>
                      )}

                      {/* Mobile Money Details */}
                      {getPaymentMethodType(paymentData.payment_option) === 'mobile' && (
                        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <h4 className="text-sm font-medium text-gray-900">Mobile Money Details</h4>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Provider
                            </label>
                            <input
                              type="text"
                              value={paymentData.payment_details.provider}
                              onChange={(e) =>
                                setPaymentData({
                                  ...paymentData,
                                  payment_details: { ...paymentData.payment_details, provider: e.target.value }
                                })
                              }
                              className="input-field"
                              placeholder="e.g., MTN, Airtel, etc."
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Account Name
                            </label>
                            <input
                              type="text"
                              value={paymentData.payment_details.account_name}
                              onChange={(e) =>
                                setPaymentData({
                                  ...paymentData,
                                  payment_details: { ...paymentData.payment_details, account_name: e.target.value }
                                })
                              }
                              className="input-field"
                              placeholder="Enter account holder name"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Account Number
                            </label>
                            <input
                              type="text"
                              value={paymentData.payment_details.account_number}
                              onChange={(e) =>
                                setPaymentData({
                                  ...paymentData,
                                  payment_details: { ...paymentData.payment_details, account_number: e.target.value }
                                })
                              }
                              className="input-field"
                              placeholder="Enter mobile money account number"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payout Schedule
                        </label>
                        <select
                          value={paymentData.payout_schedule}
                          onChange={(e) => {
                            const scheduleId = e.target.value;
                            const selected = paymentSchedules.find(s => s.id === scheduleId);
                            setPaymentData({ ...paymentData, payout_schedule: scheduleId });
                            setSelectedScheduleDescription(selected?.description || '');
                          }}
                          className="select-field"
                          disabled={loadingPaymentSchedules}
                        >
                          <option value="">Select payout schedule...</option>
                          {paymentSchedules.map((schedule) => (
                            <option key={schedule.id} value={schedule.id}>
                              {schedule.display_name}
                            </option>
                          ))}
                        </select>
                        {selectedScheduleDescription && (
                          <p className="mt-2 text-sm text-gray-600 italic">
                            {selectedScheduleDescription}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-gray-200">
                      <button
                        onClick={handleSavePayment}
                        disabled={saving}
                        className="btn-primary disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>

                    {/* Payouts Section */}
                    <div className="mt-12 pt-8 border-t-2 border-gray-200">
                      <h3 className="text-xl font-semibold text-gray-900 mb-6">Payouts</h3>
                      
                      {/* Payout Threshold Info */}
                      {payoutThreshold > 0 && (
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Minimum payout:</span>{' '}
                            {formatCurrency(payoutThreshold, payoutCurrency)} - 
                            Payouts are sent when your balance meets or exceeds this amount.
                          </p>
                        </div>
                      )}
                      
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {/* Next Payout */}
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <CalendarIcon className="h-8 w-8 text-green-600" />
                          </div>
                          <p className="text-sm font-medium text-green-900 mb-1">Next Payout</p>
                          <p className="text-lg font-bold text-green-900">
                            {formatCurrency(payoutStats.nextPayoutAmount, accountData.currency)}
                          </p>
                          <p className="text-xs text-green-700 mt-1">
                            {getDaysUntil(getNextPayoutDate())} days
                          </p>
                        </div>

                        {/* Total Earnings */}
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                          <div className="flex items-center justify-between mb-2">
                            <ChartBarIcon className="h-8 w-8 text-purple-600" />
                          </div>
                          <p className="text-sm font-medium text-purple-900 mb-1">Total Earnings</p>
                          <p className="text-2xl font-bold text-purple-900">
                            {formatCurrency(payoutStats.totalEarnings, accountData.currency)}
                          </p>
                        </div>

                        {/* Lifetime Payouts */}
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                          <div className="flex items-center justify-between mb-2">
                            <CreditCardIcon className="h-8 w-8 text-orange-600" />
                          </div>
                          <p className="text-sm font-medium text-orange-900 mb-1">Completed Payouts</p>
                          <p className="text-2xl font-bold text-orange-900">
                            {payoutStats.lifetimePayouts}
                          </p>
                        </div>
                      </div>

                      {/* Next Payout Banner */}
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 mb-8 text-white">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <CalendarIcon className="h-6 w-6" />
                              <h4 className="text-lg font-semibold">Next Payout Date</h4>
                            </div>
                            <p className="text-2xl font-bold mb-1">{payoutStats.nextPayoutDate}</p>
                            <p className="text-blue-100 text-sm">
                              Estimated amount: {formatCurrency(payoutStats.nextPayoutAmount, accountData.currency)}
                            </p>
                          </div>
                          <div className="mt-4 md:mt-0 text-right">
                            <div className="text-sm text-blue-100 mb-1">Payment Method</div>
                            <div className="inline-flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
                              <BanknotesIcon className="h-5 w-5" />
                              <span className="font-medium">
                                {paymentMethods.find(m => m.id === paymentData.payment_option)?.display_name || 'Not set'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payout Eligibility Messages */}
                      {payoutThreshold > 0 && payoutStats.nextPayoutAmount > 0 && payoutStats.nextPayoutAmount < payoutThreshold && (
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <span className="font-medium">Note:</span> You need{' '}
                            {formatCurrency(payoutThreshold - payoutStats.nextPayoutAmount, payoutCurrency)}{' '}
                            more to reach the minimum payout threshold of {formatCurrency(payoutThreshold, payoutCurrency)}.
                          </p>
                        </div>
                      )}

                      {payoutThreshold > 0 && payoutStats.nextPayoutAmount >= payoutThreshold && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">
                            <span className="font-medium">✓ Eligible:</span> Your balance meets the minimum payout threshold.
                          </p>
                        </div>
                      )}

                      {/* Payout History Table */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Payout History</h4>
                        
                        {payoutHistory.length === 0 ? (
                          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                            <BanknotesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 font-medium">No payout history yet</p>
                            <p className="text-gray-500 text-sm mt-1">Your payouts will appear here once processed</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Period
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sales
                                  </th>
                                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Action
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {payoutHistory.slice(0, 10).map((payout) => {
                                  const statusColor = getPayoutStatusColor(payout.status);
                                  return (
                                    <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatDateRange(payout.periodStart, payout.periodEnd)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {getPaymentTypeLabel(payout.type)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                        {formatCurrency(payout.amount, payout.currency)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                                          {statusColor.label}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {payout.salesData.totalSales} sales
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button
                                          onClick={() => {
                                            setSelectedPayout(payout);
                                            setShowPayoutDetails(true);
                                          }}
                                          className="text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                          View Details
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                        
                        {payoutHistory.length > 10 && (
                          <div className="mt-4 text-center">
                            <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                              View All Payouts ({payoutHistory.length})
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Payout Details Modal */}
                {showPayoutDetails && selectedPayout && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                      {/* Modal Header */}
                      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-gray-900">Payout Details</h3>
                        <button
                          onClick={() => setShowPayoutDetails(false)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <XMarkIcon className="h-6 w-6" />
                        </button>
                      </div>

                      {/* Modal Content */}
                      <div className="p-6 space-y-6">
                        {/* Status Badge */}
                        <div>
                          {(() => {
                            const statusColor = getPayoutStatusColor(selectedPayout.status);
                            return (
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColor.bg} ${statusColor.text}`}>
                                {statusColor.label}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Payment Overview */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Period</p>
                            <p className="font-medium text-gray-900">
                              {formatDateRange(selectedPayout.periodStart, selectedPayout.periodEnd)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Type</p>
                            <p className="font-medium text-gray-900">
                              {getPaymentTypeLabel(selectedPayout.type)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Amount</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {formatCurrency(selectedPayout.amount, selectedPayout.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Payment Method</p>
                            <p className="font-medium text-gray-900 capitalize">
                              {selectedPayout.paymentMethod.type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>

                        {/* Sales Breakdown */}
                        <div className="border-t border-gray-200 pt-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">Sales Breakdown</h4>
                          <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Sales</span>
                              <span className="font-medium text-gray-900">
                                {selectedPayout.salesData.totalSales} units
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Revenue</span>
                              <span className="font-medium text-gray-900">
                                {formatCurrency(selectedPayout.salesData.totalRevenue, selectedPayout.currency)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Royalty Rate</span>
                              <span className="font-medium text-gray-900">
                                {(selectedPayout.salesData.royaltyRate * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-gray-300 pt-3">
                              <span className="text-gray-600">Platform Fee</span>
                              <span className="font-medium text-red-600">
                                -{formatCurrency(selectedPayout.salesData.platformFee, selectedPayout.currency)}
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-gray-300 pt-3">
                              <span className="font-semibold text-gray-900">Net Amount</span>
                              <span className="font-bold text-green-600">
                                {formatCurrency(selectedPayout.salesData.netAmount, selectedPayout.currency)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Timeline */}
                        {(selectedPayout.processedAt || selectedPayout.paidAt) && (
                          <div className="border-t border-gray-200 pt-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h4>
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                <div>
                                  <p className="font-medium text-gray-900">Created</p>
                                  <p className="text-sm text-gray-600">
                                    {formatDate(selectedPayout.createdAt, 'long')}
                                  </p>
                                </div>
                              </div>
                              {selectedPayout.processedAt && (
                                <div className="flex items-start gap-3">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                                  <div>
                                    <p className="font-medium text-gray-900">Processed</p>
                                    <p className="text-sm text-gray-600">
                                      {formatDate(selectedPayout.processedAt, 'long')}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {selectedPayout.paidAt && (
                                <div className="flex items-start gap-3">
                                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                                  <div>
                                    <p className="font-medium text-gray-900">Paid</p>
                                    <p className="text-sm text-gray-600">
                                      {formatDate(selectedPayout.paidAt, 'long')}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Modal Footer */}
                      <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
                        <button
                          onClick={() => setShowPayoutDetails(false)}
                          className="btn-primary"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900">Preferences</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Theme
                        </label>
                        <select
                          value={preferencesData.theme}
                          onChange={(e) =>
                            setPreferencesData({ ...preferencesData, theme: e.target.value })
                          }
                          className="select-field"
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="system">System</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date Format
                        </label>
                        <select
                          value={preferencesData.dateFormat}
                          onChange={(e) =>
                            setPreferencesData({ ...preferencesData, dateFormat: e.target.value })
                          }
                          className="select-field"
                        >
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Time Format
                        </label>
                        <select
                          value={preferencesData.timeFormat}
                          onChange={(e) =>
                            setPreferencesData({ ...preferencesData, timeFormat: e.target.value })
                          }
                          className="select-field"
                        >
                          <option value="12h">12-hour</option>
                          <option value="24h">24-hour</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-gray-200">
                      <button
                        disabled={saving}
                        className="btn-primary disabled:opacity-50"
                        onClick={handleSavePreferences}
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

