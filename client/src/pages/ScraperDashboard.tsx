import { useState } from 'react';
import MainLayout from '../components/MainLayout';

const API = import.meta.env.VITE_API_URL || 'https://bluewhale-production-afb0.up.railway.app/api/v1';

export default function ScraperDashboard() {
  const [log, setLog] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const sync = async () => {
    setLoading(true);
    const r = await fetch(`${API}/sync/prices`);
    setLog(await r.json());
    setLoading(false);
  };

  return (
    <MainLayout>
      <div className="p-6 text-white">
        <h1 className="text-2xl font-bold mb-4">Scraper Dashboard</h1>
        <button onClick={sync} disabled={loading} className="bg-green-600 px-4 py-2 rounded">
          {loading? 'Syncing...' : 'Run JSE Price Sync Now'}
        </button>
        {log && <pre className="bg-black mt-4 p-4 rounded text-xs overflow-auto">{JSON.stringify(log, null, 2)}</pre>}
      </div>
    </MainLayout>
  );
}
