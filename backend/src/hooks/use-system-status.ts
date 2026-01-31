import { useState, useEffect } from 'react';

type ServiceStatus = 'online' | 'offline' | 'checking';

export function useSystemStatus() {
    const [inferenceStatus, setInferenceStatus] = useState<ServiceStatus>('checking');
    const [memoryStatus, setMemoryStatus] = useState<ServiceStatus>('checking');
    const [inferenceError, setInferenceError] = useState<string>('');
    const [memoryError, setMemoryError] = useState<string>('');

    const checkHealth = async () => {
        try {
            const infRes = await fetch('/api/health/inference');
            if (infRes.ok) {
                setInferenceStatus('online');
                setInferenceError('');
            } else {
                setInferenceStatus('offline');
                const data = await infRes.json().catch(() => ({}));
                setInferenceError(data.error || 'Service Unavailable');
            }
        } catch (e) {
            setInferenceStatus('offline');
            setInferenceError('Network Error');
        }

        try {
            const memRes = await fetch('/api/health/memory');
            if (memRes.ok) {
                setMemoryStatus('online');
                setMemoryError('');
            } else {
                setMemoryStatus('offline');
                const data = await memRes.json().catch(() => ({}));
                setMemoryError(data.error || 'Service Unavailable');
            }
        } catch (e) {
            setMemoryStatus('offline');
            setMemoryError('Network Error');
        }
    };

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    return {
        inferenceStatus,
        memoryStatus,
        inferenceError,
        memoryError,
        refetch: checkHealth
    };
}
