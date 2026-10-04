import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";

// Atur lama tampil (milidetik) di sini
const STATIC_MS = 1500; // splash-static.jpg tampil dulu
const ANIM_MS = 3000; // lalu splash.gif

type Props = { ready: boolean; onFinish: () => void };

export function SplashSequence({ ready, onFinish }: Props) {
  const [stage, setStage] = useState<1 | 2>(1);
  const [animDone, setAnimDone] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(2), STATIC_MS);
    const t2 = setTimeout(() => setAnimDone(true), STATIC_MS + ANIM_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    if (animDone && ready) finish();
  }, [animDone, ready, finish]);

  return (
    <Pressable
      style={styles.root}
      onPress={() => {
        if (ready) finish();
      }}
      onLayout={() => {
        SplashScreen.hideAsync().catch(() => {});
      }}
    >
      <Image
        source={require("../../assets/images/splash-static.jpg")}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <Image
        source={require("../../assets/images/splash.gif")}
        style={[StyleSheet.absoluteFill, { opacity: stage === 2 ? 1 : 0 }]}
        contentFit="cover"
        autoplay={stage === 2}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: "#000000",
  },
});
