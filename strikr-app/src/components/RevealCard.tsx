import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

// Spring-in entrance for a newly revealed club card, echoing the design
// spec's .strikr-card-reveal keyframe (translateY + scale bounce). Relies on
// the parent using a stable `key` per club index: React only mounts this
// component fresh the moment that slot flips from locked to revealed, so
// already-revealed cards never replay the animation on subsequent renders.
//
// `animate` is only read at mount time (via the initial Animated.Value and
// the empty-deps effect below) — matching the spec, where only a
// wrong-guess reveal (one card at a time) animates in, while the batch of
// cards revealed all at once on a win appears instantly since the win
// overlay covers them right away anyway.
export default function RevealCard({ children, animate = true }: { children: React.ReactNode; animate?: boolean }) {
  const translateY = useRef(new Animated.Value(animate ? 10 : 0)).current;
  const opacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const scale = useRef(new Animated.Value(animate ? 0.96 : 1)).current;

  useEffect(() => {
    if (!animate) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 6, tension: 60, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>{children}</Animated.View>;
}
