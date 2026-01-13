import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function TestPage() {
  const [status, setStatus] = useState<string>('Checking...');
  const [error, setError] = useState<string | null>(null);
  const [envVars, setEnvVars] = useState<any>({});

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check env vars
        setEnvVars({
          SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
          HAS_ANON_KEY: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
          HAS_PUBLISHABLE_KEY: !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        });

        // Test connection
        const { data, error } = await supabase.from('outlets').select('count');
        
        if (error) {
          setError(error.message);
          setStatus('Connection Failed');
        } else {
          setStatus('Connected Successfully! ✅');
        }
      } catch (err: any) {
        setError(err.message);
        setStatus('Error');
      }
    };

    checkConnection();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 Supabase Connection Test</h1>
      <hr />
      
      <h2>Status: {status}</h2>
      
      <h3>Environment Variables:</h3>
      <pre>{JSON.stringify(envVars, null, 2)}</pre>
      
      {error && (
        <>
          <h3 style={{ color: 'red' }}>Error:</h3>
          <pre style={{ color: 'red' }}>{error}</pre>
        </>
      )}

      <hr />
      <p>If you see "Connected Successfully", your Supabase setup is working!</p>
    </div>
  );
}
