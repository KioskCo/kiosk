import { useCallback, useEffect } from "react";
import { setAudioMode, playSound } from "@/lib/audio";

const NOTIFY_SRC = require("../assets/sounds/ding_normalnotify.mp3");
const MONEY_SRC  = require("../assets/sounds/moneyenternotification.mp3");

export function useSounds() {
  useEffect(() => { setAudioMode().catch(() => {}); }, []);

  const playNotify = useCallback(async () => { try { await playSound(NOTIFY_SRC); } catch {} }, []);
  const playMoney  = useCallback(async () => { try { await playSound(MONEY_SRC);  } catch {} }, []);

  return { playNotify, playMoney };
}
