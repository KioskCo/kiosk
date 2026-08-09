import * as Network from "expo-network";
import { useEffect, useRef, useState } from "react";

export type NetworkStatus = {
  isOnline: boolean;
  /** true during the first check — avoids flash of "offline" on mount */
  checking: boolean;
};

export function useNetworkStatus(): NetworkStatus {
  const [state, setState] = useState<NetworkStatus>({ isOnline: true, checking: true });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const check = async () => {
      const net = await Network.getNetworkStateAsync();
      if (mounted.current) {
        setState({ isOnline: net.isConnected === true && net.isInternetReachable !== false, checking: false });
      }
    };

    check();
    const sub = Network.addNetworkStateListener((net) => {
      if (mounted.current) {
        setState({ isOnline: net.isConnected === true && net.isInternetReachable !== false, checking: false });
      }
    });

    return () => {
      mounted.current = false;
      sub.remove();
    };
  }, []);

  return state;
}
