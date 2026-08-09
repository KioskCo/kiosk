import { Audio } from "expo-av";

// Android's ExoPlayer checks that the player is used on the same thread it was
// created on. Caching an Audio.Sound object across async boundaries (e.g. mount
// vs. push-notification callback) changes the thread context and triggers the
// "player is accessed on the wrong thread" warning — which becomes a hard
// IllegalStateException crash in Play Store release builds.
//
// Fix: never cache a Sound instance. Create, play, and auto-unload in one call
// so ExoPlayer is always used on the thread it was created on.

export async function setAudioMode(): Promise<void> {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

export async function playSound(source: Parameters<typeof Audio.Sound.createAsync>[0]): Promise<void> {
  const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true });
  sound.setOnPlaybackStatusUpdate((status: any) => {
    if (status.didJustFinish) {
      sound.unloadAsync().catch(() => {});
    }
  });
}
