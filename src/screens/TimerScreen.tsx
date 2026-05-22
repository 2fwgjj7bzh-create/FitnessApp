import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { formatTime } from '../utils/helpers';

type TimerMode = 'stopwatch' | 'countdown';

const PRESET_TIMES = [30, 60, 90, 120, 180, 240, 300];

export default function TimerScreen() {
  const [mode, setMode] = useState<TimerMode>('countdown');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);           // stopwatch seconds
  const [countdown, setCountdown] = useState(90);      // countdown target
  const [remaining, setRemaining] = useState(90);      // countdown remaining
  const [laps, setLaps] = useState<number[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevElapsed = useRef(0);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimer();
  }, []);

  const startStopwatch = () => {
    setRunning(true);
    const start = Date.now() - elapsed * 1000;
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 100);
  };

  const startCountdown = () => {
    setRunning(true);
    let rem = remaining;
    intervalRef.current = setInterval(() => {
      rem -= 1;
      setRemaining(rem);
      if (rem <= 0) {
        clearTimer();
        setRunning(false);
        Vibration.vibrate([0, 300, 200, 300, 200, 500]);
      }
    }, 1000);
  };

  const pause = () => {
    clearTimer();
    setRunning(false);
  };

  const reset = () => {
    clearTimer();
    setRunning(false);
    if (mode === 'stopwatch') {
      setElapsed(0);
      setLaps([]);
    } else {
      setRemaining(countdown);
    }
  };

  const toggleTimer = () => {
    if (running) {
      pause();
    } else {
      if (mode === 'stopwatch') startStopwatch();
      else startCountdown();
    }
  };

  const lap = () => {
    setLaps(prev => [elapsed, ...prev]);
  };

  const setPreset = (secs: number) => {
    if (running) return;
    setCountdown(secs);
    setRemaining(secs);
  };

  const switchMode = (m: TimerMode) => {
    clearTimer();
    setRunning(false);
    setElapsed(0);
    setLaps([]);
    setRemaining(countdown);
    setMode(m);
  };

  const countdownPercent = countdown > 0 ? (remaining / countdown) * 100 : 0;
  const isFinished = mode === 'countdown' && remaining <= 0;

  const displaySeconds = mode === 'stopwatch' ? elapsed : remaining;
  const ringColor = isFinished ? colors.error : running ? colors.success : colors.primary;

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Timer</Text>

      {/* Mode selector */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'countdown' && styles.modeBtnActive]}
          onPress={() => switchMode('countdown')}
        >
          <Ionicons name="timer-outline" size={16} color={mode === 'countdown' ? colors.text : colors.textSecondary} />
          <Text style={[styles.modeBtnText, mode === 'countdown' && styles.modeBtnTextActive]}>Compte à rebours</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'stopwatch' && styles.modeBtnActive]}
          onPress={() => switchMode('stopwatch')}
        >
          <Ionicons name="stopwatch-outline" size={16} color={mode === 'stopwatch' ? colors.text : colors.textSecondary} />
          <Text style={[styles.modeBtnText, mode === 'stopwatch' && styles.modeBtnTextActive]}>Chronomètre</Text>
        </TouchableOpacity>
      </View>

      {/* Timer display */}
      <View style={styles.timerContainer}>
        {/* Ring */}
        <View style={styles.ringOuter}>
          <View style={[styles.ringInner, { borderColor: ringColor }]}>
            {mode === 'countdown' && (
              <View style={[styles.ringProgress, {
                borderColor: ringColor,
                // Visual progress via opacity trick
              }]} />
            )}
            <Text style={[styles.timerDisplay, { color: isFinished ? colors.error : colors.text }]}>
              {formatTime(displaySeconds)}
            </Text>
            {mode === 'stopwatch' && (
              <Text style={styles.timerMs}>
                {String(Math.floor((elapsed % 1) * 10)).padStart(1, '0')}
              </Text>
            )}
            {isFinished && <Text style={styles.finishedLabel}>Terminé ! 🎉</Text>}
            {mode === 'countdown' && !isFinished && (
              <Text style={styles.progressLabel}>{Math.round(countdownPercent)}%</Text>
            )}
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {mode === 'stopwatch' && (
            <TouchableOpacity
              style={[styles.controlBtn, styles.controlBtnSecondary]}
              onPress={running ? lap : reset}
            >
              <Text style={styles.controlBtnSecText}>{running ? 'Tour' : 'Reset'}</Text>
            </TouchableOpacity>
          )}

          {mode === 'countdown' && (
            <TouchableOpacity
              style={[styles.controlBtn, styles.controlBtnSecondary]}
              onPress={reset}
            >
              <Text style={styles.controlBtnSecText}>Reset</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.controlBtn, styles.controlBtnPrimary, { backgroundColor: running ? colors.secondary : colors.success }]}
            onPress={toggleTimer}
          >
            <Ionicons name={running ? 'pause' : 'play'} size={32} color={colors.text} />
          </TouchableOpacity>

          {mode === 'stopwatch' ? (
            <View style={styles.controlBtnPlaceholder} />
          ) : (
            <View style={styles.controlBtnPlaceholder} />
          )}
        </View>

        {/* Countdown presets */}
        {mode === 'countdown' && !running && (
          <View style={styles.presetsSection}>
            <Text style={styles.presetsLabel}>Temps de repos rapide</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
              {PRESET_TIMES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.presetBtn, countdown === t && styles.presetBtnActive]}
                  onPress={() => setPreset(t)}
                >
                  <Text style={[styles.presetBtnText, countdown === t && styles.presetBtnTextActive]}>
                    {t >= 60 ? `${t / 60}min` : `${t}s`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Laps */}
        {mode === 'stopwatch' && laps.length > 0 && (
          <View style={styles.lapsSection}>
            <Text style={styles.lapsTitle}>Tours</Text>
            <ScrollView style={styles.lapsList} showsVerticalScrollIndicator={false}>
              {laps.map((lap, i) => {
                const prev = i < laps.length - 1 ? laps[i + 1] : 0;
                const lapTime = lap - prev;
                return (
                  <View key={i} style={styles.lapRow}>
                    <Text style={styles.lapNum}>Tour {laps.length - i}</Text>
                    <Text style={styles.lapTime}>{formatTime(lapTime)}</Text>
                    <Text style={styles.lapTotal}>{formatTime(lap)}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, padding: spacing.md },
  modeRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.lg,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 10, borderRadius: borderRadius.sm,
  },
  modeBtnActive: { backgroundColor: colors.primary },
  modeBtnText: { ...typography.label, color: colors.textSecondary },
  modeBtnTextActive: { color: colors.text, fontWeight: '600' },
  timerContainer: { alignItems: 'center', flex: 1 },
  ringOuter: {
    width: 240, height: 240,
    borderRadius: 120,
    backgroundColor: colors.card,
    justifyContent: 'center', alignItems: 'center',
    ...shadows.md,
    marginBottom: spacing.xl,
  },
  ringInner: {
    width: 220, height: 220,
    borderRadius: 110,
    borderWidth: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  ringProgress: { position: 'absolute', width: '100%', height: '100%', borderRadius: 110 },
  timerDisplay: { fontSize: 56, fontWeight: '700', letterSpacing: -2 },
  timerMs: { ...typography.h3, color: colors.textSecondary },
  finishedLabel: { ...typography.label, color: colors.error, marginTop: spacing.xs },
  progressLabel: { ...typography.label, color: colors.textSecondary, marginTop: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  controlBtn: {
    width: 70, height: 70, borderRadius: 35,
    justifyContent: 'center', alignItems: 'center',
  },
  controlBtnPrimary: { width: 84, height: 84, borderRadius: 42, ...shadows.md },
  controlBtnSecondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  controlBtnSecText: { ...typography.label, color: colors.text },
  controlBtnPlaceholder: { width: 70, height: 70 },
  presetsSection: { marginTop: spacing.xl, width: '100%', paddingHorizontal: spacing.md },
  presetsLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm, textAlign: 'center' },
  presetsRow: { gap: spacing.sm, paddingHorizontal: spacing.sm },
  presetBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.card, borderRadius: borderRadius.round,
    borderWidth: 1, borderColor: colors.border,
  },
  presetBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  presetBtnText: { ...typography.label, color: colors.textSecondary },
  presetBtnTextActive: { color: colors.text },
  lapsSection: {
    marginTop: spacing.lg, width: '100%', paddingHorizontal: spacing.md,
    flex: 1, maxHeight: 200,
  },
  lapsTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  lapsList: { flex: 1 },
  lapRow: {
    flexDirection: 'row', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  lapNum: { ...typography.label, color: colors.textSecondary, flex: 1 },
  lapTime: { ...typography.bodyBold, color: colors.primary, flex: 1, textAlign: 'center' },
  lapTotal: { ...typography.label, color: colors.textMuted, flex: 1, textAlign: 'right' },
});
