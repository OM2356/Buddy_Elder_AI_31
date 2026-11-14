import React, { useEffect, useState } from 'react';
import { AlertCircle, MapPin, PhoneCall, ShieldAlert, Heart } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiRequest } from '../../lib/api';
import type { TrustedContact } from '../../types';

export const EmergencyView: React.FC = () => {
  const { profile } = useApp();
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [confirmStep, setConfirmStep] = useState<0 | 1 | 2>(0);
  const [shareLocation, setShareLocation] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState('');
  const [sosStatus, setSosStatus] = useState('');

  useEffect(() => {
    apiRequest<{ contacts: TrustedContact[] }>('/api/family/contacts')
      .then((d) => setContacts(d.contacts.filter((c) => c.is_emergency)))
      .catch(() => {});
  }, []);

  const requestLocation = () => {
    setLocError('');
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: Number(pos.coords.latitude.toFixed(5)), lng: Number(pos.coords.longitude.toFixed(5)) });
        setShareLocation(true);
      },
      () => {
        setLocError('Location permission denied or unavailable. You can still call emergency helplines directly.');
        setShareLocation(false);
      }
    );
  };

  const finalizeSos = async () => {
    try {
      await apiRequest('/api/emergency/sos', {
        method: 'POST',
        body: JSON.stringify({
          locationShared: Boolean(shareLocation && coords),
          latitude: coords?.lat,
          longitude: coords?.lng,
          note: 'Double-confirmed SOS initiated by senior.',
        }),
      });
      setSosStatus(
        'SOS confirmation logged. Please tap the 112 (Emergency) or 108 (Ambulance) call button below to place your phone call.'
      );
      setConfirmStep(0);
    } catch {
      setSosStatus('Tap 112 or 108 below immediately for phone assistance.');
      setConfirmStep(0);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[#0F3D5E] dark:text-white">Emergency Assistance (India)</h1>
        <p className="text-lg text-[#4A5A68] dark:text-slate-300">
          Verified Indian emergency helplines and your voluntary medical card. Calls and location sharing never start without your explicit confirmation.
        </p>
      </header>

      {sosStatus && (
        <div role="status" className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-400 text-lg font-bold">
          {sosStatus}
        </div>
      )}

      {/* Verified Indian Helplines */}
      <section className="grid md:grid-cols-3 gap-5">
        <a
          href="tel:112"
          className="p-6 rounded-2xl bg-red-700 hover:bg-red-800 text-white space-y-2 transition-colors"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-red-100">National Emergency</p>
          <p className="text-4xl font-bold tabular-nums">112</p>
          <p className="text-base">Police, Fire &amp; Immediate Rescue across India</p>
        </a>

        <a
          href="tel:108"
          className="p-6 rounded-2xl bg-[#0F3D5E] hover:bg-[#0B2D47] text-white space-y-2 transition-colors"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-200">Medical Ambulance</p>
          <p className="text-4xl font-bold tabular-nums">108</p>
          <p className="text-base">Emergency Ambulance Service (where available)</p>
        </a>

        <a
          href="tel:1930"
          className="p-6 rounded-2xl bg-[#0D7377] hover:bg-[#0A5A5E] text-white space-y-2 transition-colors"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-100">Cyber Fraud Helpline</p>
          <p className="text-4xl font-bold tabular-nums">1930</p>
          <p className="text-base">Immediate financial &amp; UPI scam reporting</p>
        </a>
      </section>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Double-Confirmation SOS & Location */}
        <section className="lg:col-span-6 bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-600" />
            <span>Guided SOS with Double Confirmation</span>
          </h2>
          <p className="text-base text-[#4A5A68] dark:text-slate-300">
            To prevent accidental taps, SOS requires two clear confirmations before recording an alert.
          </p>

          <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-slate-900 border border-[#E5DEC9] dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#0D7377]" />
                <span className="font-bold">Optional Location Permission</span>
              </div>
              <button
                type="button"
                onClick={requestLocation}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-[#0D7377] text-[#0D7377] dark:text-teal-300 font-bold text-sm"
              >
                {coords ? 'Refresh Coordinates' : 'Share My Location'}
              </button>
            </div>
            {coords && (
              <p className="text-sm font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                Coordinates ready: {coords.lat}, {coords.lng}
              </p>
            )}
            {locError && <p className="text-sm text-red-600 dark:text-red-400">{locError}</p>}
          </div>

          <button
            type="button"
            onClick={() => setConfirmStep(1)}
            className="w-full min-h-[60px] px-6 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xl font-bold transition-colors"
          >
            Trigger SOS Confirmation
          </button>

          <div className="pt-4 border-t border-[#E5DEC9] dark:border-slate-800 space-y-3">
            <h3 className="text-xl font-bold">Emergency Trusted Contacts</h3>
            {contacts.length === 0 ? (
              <p className="text-base text-[#4A5A68] dark:text-slate-400">
                No emergency contacts marked yet. Add them in Family Hub.
              </p>
            ) : (
              <ul className="space-y-3">
                {contacts.map((c) => (
                  <li key={c.id} className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-slate-900 border border-[#E5DEC9] dark:border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold">{c.name}</p>
                      <p className="text-sm text-[#4A5A68] dark:text-slate-400 tabular-nums">{c.relationship} · {c.phone}</p>
                    </div>
                    <a
                      href={`tel:${c.phone}`}
                      className="min-h-[48px] px-4 py-2 rounded-xl bg-[#0D7377] text-white font-bold inline-flex items-center gap-2"
                    >
                      <PhoneCall className="w-5 h-5" />
                      <span>Call</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Voluntary Emergency Medical Card */}
        <section className="lg:col-span-6 bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6 text-[#0D7377]" />
            <span>Voluntary Medical &amp; Care Card</span>
          </h2>
          <p className="text-sm text-[#4A5A68] dark:text-slate-400">
            Information below is entered voluntarily by you in Settings &amp; Profile to help family or responders during an emergency.
          </p>

          <dl className="divide-y divide-[#E5DEC9] dark:divide-slate-800 text-lg">
            <div className="py-3 flex justify-between gap-4">
              <dt className="font-semibold text-[#4A5A68] dark:text-slate-400">Blood Group</dt>
              <dd className="font-bold">{profile?.blood_group || 'Not entered'}</dd>
            </div>
            <div className="py-3 flex justify-between gap-4">
              <dt className="font-semibold text-[#4A5A68] dark:text-slate-400">City</dt>
              <dd className="font-bold">{profile?.city || 'Not entered'}</dd>
            </div>
            <div className="py-3 space-y-1">
              <dt className="font-semibold text-[#4A5A68] dark:text-slate-400">Allergies</dt>
              <dd>{profile?.allergies || 'None entered'}</dd>
            </div>
            <div className="py-3 space-y-1">
              <dt className="font-semibold text-[#4A5A68] dark:text-slate-400">Important Medical Notes</dt>
              <dd>{profile?.medical_notes || 'None entered'}</dd>
            </div>
            <div className="py-3 space-y-1">
              <dt className="font-semibold text-[#4A5A68] dark:text-slate-400">Emergency Instructions</dt>
              <dd>{profile?.emergency_instructions || 'Keep calm, stay seated, and call primary family contact.'}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Double-Confirmation Dialog */}
      {confirmStep > 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="max-w-lg w-full bg-white dark:bg-[#121F2C] rounded-2xl border border-[#E5DEC9] dark:border-slate-700 p-6 space-y-5">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-8 h-8" />
              <h2 className="text-2xl font-bold">
                {confirmStep === 1 ? 'Step 1 of 2: Confirm Emergency?' : 'Step 2 of 2: Final SOS Confirmation'}
              </h2>
            </div>

            {confirmStep === 1 ? (
              <p className="text-lg">
                Do you genuinely need emergency assistance right now? If you tapped by mistake, choose Cancel.
              </p>
            ) : (
              <p className="text-lg">
                Confirming will log your SOS event {coords ? `with coordinates (${coords.lat}, ${coords.lng})` : 'without GPS coordinates'} and highlight the 112 / 108 dialers.
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmStep(0)}
                className="min-h-[48px] px-5 py-2.5 rounded-xl border border-[#D8CEB8] dark:border-slate-700 font-bold"
              >
                Cancel
              </button>
              {confirmStep === 1 ? (
                <button
                  type="button"
                  onClick={() => setConfirmStep(2)}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold"
                >
                  Continue to Final Step
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finalizeSos}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl bg-red-700 text-white font-bold"
                >
                  Yes, Confirm SOS Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
