import { useState, useEffect } from 'react';
import { bridge } from '../../bridge/BridgeClient';
import { DeviceInfo } from '../../bridge/types';

export function useBridge() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [runtimes, setRuntimes] = useState<string[]>([]);
  const [isNative, setIsNative] = useState<boolean>(bridge.isNative);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const info = await bridge.getDeviceInfo();
        const rts = await bridge.getAvailableRuntimes();
        if (mounted) {
          setDeviceInfo(info);
          setRuntimes(rts);
          setIsNative(bridge.isNative);
        }
      } catch (err) {
        console.warn('[useBridge] Failed loading telemetry:', err);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  return {
    deviceInfo,
    runtimes,
    isNative,
    bridge,
  };
}
