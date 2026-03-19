import { Audio } from 'expo-av';

let popSound: Audio.Sound | null = null;
let swooshSound: Audio.Sound | null = null;
let clickSound: Audio.Sound | null = null;

async function loadSound(
  setter: (s: Audio.Sound) => void,
  url: string
): Promise<Audio.Sound | null> {
  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: false, volume: 0.8 }
    );
    setter(sound);
    return sound;
  } catch {
    return null;
  }
}

export async function initSounds() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    await Promise.all([
      loadSound((s) => { popSound = s; }, 'https://assets.mixkit.co/active_storage/sfx/2570-pop-943.mp3'),
      loadSound((s) => { swooshSound = s; }, 'https://assets.mixkit.co/active_storage/sfx/2568-swoosh-15.mp3'),
      loadSound((s) => { clickSound = s; }, 'https://assets.mixkit.co/active_storage/sfx/2570-pop-943.mp3'),
    ]);
  } catch {}
}

export async function playPop() {
  try {
    if (popSound) {
      await popSound.replayAsync();
    }
  } catch {}
}

export async function playSwoosh() {
  try {
    if (swooshSound) {
      await swooshSound.replayAsync();
    }
  } catch {}
}

export async function playClick() {
  try {
    if (clickSound) {
      await clickSound.replayAsync();
    }
  } catch {}
}
