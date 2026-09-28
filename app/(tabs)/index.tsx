import React, { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  StyleSheet, Pressable, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors, SensoryColors } from '@/constants/theme';
import { useActivities, parseTimeToMinutes, type Activity } from '@/context/ActivitiesContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SensoryTag } from '@/components/ui/SensoryTag';
import { SourceBadge } from '@/components/ui/SourceBadge';
import { LogoMark } from '@/components/ui/LogoMark';

// ── Settings gear icon ──────────────────────────────────────────────────────
function GearIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke={Colors.textSoft} strokeWidth="1.8" />
      <Path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke={Colors.textSoft}
        strokeWidth="1.8"
      />
    </Svg>
  );
}

// ── Calendar icon ───────────────────────────────────────────────────────────
function CalendarIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
        stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M8 2v4M16 2v4" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

// ── Chevron icon ─────────────────────────────────────────────────────────────
function ChevronDown({ rotated }: { rotated: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none"
      style={{ transform: [{ rotate: rotated ? '180deg' : '0deg' }] }}>
      <Path d="M4 6l4 4 4-4" stroke={Colors.dark} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

// ── OT Banner ─────────────────────────────────────────────────────────────────
function OTBanner({ otName, otNotes }: { otName: string; otNotes: string }) {
  const [open, setOpen] = useState(false);
  const initials = otName
    .replace(/\b(dr|ot|mr|mrs|ms|miss)\.?\s+/gi, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
  return (
    <View style={styles.banner}>
      <TouchableOpacity style={styles.bannerHeader} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <View style={styles.bannerLeft}>
          <View style={styles.avatarCircle}>
            {initials ? (
              <Text style={styles.avatarInitials}>{initials}</Text>
            ) : (
              <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="8" r="3.5" stroke={Colors.white} strokeWidth="1.8" />
                <Path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" stroke={Colors.white} strokeWidth="1.8" strokeLinecap="round" />
              </Svg>
            )}
          </View>
          <Text style={styles.bannerName}>OT notes</Text>
        </View>
        <ChevronDown rotated={open} />
      </TouchableOpacity>
      {open && (
        <View style={styles.bannerBody}>
          <Text style={styles.bannerNote}>{otNotes}</Text>
        </View>
      )}
    </View>
  );
}

// ── Activity card ─────────────────────────────────────────────────────────────
function ActivityCard({
  activity, index, total, editOrder, onMarkDone, onUnmarkDone, onSkip, onUnskip, onDelete, onMoveUp, onMoveDown,
  canMoveUp, canMoveDown, pendingReaction, onReact,
}: {
  activity: Activity;
  index: number;
  total: number;
  editOrder: boolean;
  onMarkDone: () => void;
  onUnmarkDone: () => void;
  onSkip: () => void;
  onUnskip: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  pendingReaction?: boolean;
  onReact?: (r: 'liked' | 'neutral' | 'disliked' | null) => void;
}) {
  const isNext = activity.status === 'next';
  const isDone = activity.status === 'done';
  const isSkipped = activity.status === 'skipped';
  const isLast = index === total - 1;
  const now = new Date();
  const isMissed = !isDone && !isSkipped && !!activity.time
    && parseTimeToMinutes(activity.time) < now.getHours() * 60 + now.getMinutes();

  return (
    <View style={styles.timelineRow}>
      {/* Rail */}
      {editOrder ? (
        <View style={styles.reorderRail}>
          <Pressable
            onPress={onMoveUp}
            disabled={!canMoveUp}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.reorderBtn, { opacity: canMoveUp ? 1 : 0.2 }]}
          >
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path d="M7 10V4M4 7l3-3 3 3" stroke={Colors.dark} strokeWidth="1.5" strokeLinecap="round" />
            </Svg>
          </Pressable>
          <View style={styles.dragHandle}>
            <Svg width={12} height={10} viewBox="0 0 12 10" fill="none">
              <Path d="M1 2h10M1 5h10M1 8h10" stroke={Colors.textSoft} strokeWidth="1.5" strokeLinecap="round" />
            </Svg>
          </View>
          <Pressable
            onPress={onMoveDown}
            disabled={!canMoveDown}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.reorderBtn, { opacity: canMoveDown ? 1 : 0.2 }]}
          >
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path d="M7 4v6M4 7l3 3 3-3" stroke={Colors.dark} strokeWidth="1.5" strokeLinecap="round" />
            </Svg>
          </Pressable>
        </View>
      ) : (
        <View style={styles.dotRail}>
          <View style={[
            styles.dot,
            (isDone || isSkipped) && styles.dotDone,
            isNext && styles.dotNext,
          ]} />
          {!isLast && (
            <View style={[styles.railLine, isDone && styles.railLineDone]} />
          )}
        </View>
      )}

      {/* Card */}
      <View style={styles.cardWrapper}>
        <View style={styles.timeLabelRow}>
          <Text style={styles.timeLabel}>{activity.time}</Text>
          {isMissed && <Text style={styles.missedLabel}>Missed</Text>}
        </View>
        <View style={[
          styles.card,
          isNext && !editOrder && styles.cardNext,
          (isDone || isSkipped) && !editOrder && styles.cardDone,
        ]}>
          {/* Header row */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={2}>{activity.name}</Text>
            <View style={styles.cardHeaderRight}>
              {isDone && !editOrder && (
                <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                  <Circle cx="9" cy="9" r="9" fill={Colors.primary} />
                  <Path d="M5 9l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
              )}
              {isSkipped && !editOrder && (
                <Text style={styles.skippedBadge}>Skipped</Text>
              )}
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.deleteBtn}
                activeOpacity={0.7}
              >
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.cardDesc}>{activity.desc}</Text>

          <View style={styles.cardFooter}>
            <View style={styles.cardTags}>
              <SensoryTag system={activity.system as any} small />
              {activity.source !== 'ai' && (
                <>
                  <View style={styles.tagDivider} />
                  <SourceBadge source={activity.source} />
                </>
              )}
            </View>
            <Text style={styles.duration}>{activity.duration} min</Text>
          </View>

          {!editOrder && (
            pendingReaction ? (
              <View style={styles.reactionPromptBox}>
                <Text style={styles.reactionQuestion}>How did it go?</Text>
                <View style={styles.reactionBtnRow}>
                  {(['liked', 'neutral', 'disliked'] as const).map(r => (
                    <TouchableOpacity key={r} style={styles.reactionBtn} onPress={() => onReact?.(r)} activeOpacity={0.7}>
                      <Text style={styles.reactionEmoji}>{r === 'liked' ? '👍' : r === 'neutral' ? '😐' : '👎'}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => onReact?.(null)} activeOpacity={0.7} style={styles.skipBtn}>
                    <Text style={styles.skipText}>Skip</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : isDone ? (
              <TouchableOpacity
                style={[styles.markDoneBtn, styles.undoneBtn]}
                onPress={onUnmarkDone}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.8}
              >
                <Text style={[styles.markDoneText, styles.undoneText]}>Mark undone</Text>
              </TouchableOpacity>
            ) : isSkipped ? (
              <TouchableOpacity
                style={[styles.markDoneBtn, styles.undoneBtn]}
                onPress={onUnskip}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.8}
              >
                <Text style={[styles.markDoneText, styles.undoneText]}>Unskip</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={styles.skipActivityBtn}
                  onPress={onSkip}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.skipActivityText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.markDoneBtn,
                    { marginTop: 0, alignSelf: 'center' },
                    !isNext && styles.markDoneBtnQuiet,
                  ]}
                  onPress={onMarkDone}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.markDoneText, !isNext && styles.markDoneTextQuiet]}>
                    Mark as done
                  </Text>
                  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                    <Path
                      d="M3 7.4l2.8 2.8L11 4.6"
                      stroke={isNext ? Colors.white : Colors.dark}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </TouchableOpacity>
              </View>
            )
          )}
        </View>
      </View>
    </View>
  );
}

// ── Add Activity Sheet ────────────────────────────────────────────────────────
function AddActivitySheet({ visible, onClose, onBrowse, onCreate, onUpload }: {
  visible: boolean;
  onClose: () => void;
  onBrowse: () => void;
  onCreate: () => void;
  onUpload: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Add activity</Text>
        <Text style={styles.sheetSub}>Choose how you'd like to add an activity to today's diet.</Text>

        <TouchableOpacity style={styles.sheetOption} onPress={onBrowse} activeOpacity={0.8}>
          <View style={styles.sheetOptionIcon}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinejoin="round" />
            </Svg>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetOptionTitle}>Browse library</Text>
            <Text style={styles.sheetOptionSub}>Pick from curated or OT activities</Text>
          </View>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Path d="M6 4l4 4-4 4" stroke={Colors.textSoft} strokeWidth="1.5" strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.sheetOption, { backgroundColor: Colors.white }]} onPress={onCreate} activeOpacity={0.8}>
          <View style={styles.sheetOptionIcon}>
            <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
              <Path d="M10 4v12M4 10h12" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" />
            </Svg>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetOptionTitle}>Create new activity</Text>
            <Text style={styles.sheetOptionSub}>Build a custom activity from scratch</Text>
          </View>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Path d="M6 4l4 4-4 4" stroke={Colors.textSoft} strokeWidth="1.5" strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.sheetOption, { backgroundColor: Colors.white }]} onPress={onUpload} activeOpacity={0.8}>
          <View style={styles.sheetOptionIcon}>
            <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
              <Path d="M10 13V3M6.5 6.5L10 3l3.5 3.5" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M3.5 13v3a1 1 0 001 1h11a1 1 0 001-1v-3" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" />
            </Svg>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetOptionTitle}>Upload home program</Text>
            <Text style={styles.sheetOptionSub}>Pull activities from your OT's plan</Text>
          </View>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Path d="M6 4l4 4-4 4" stroke={Colors.textSoft} strokeWidth="1.5" strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Home Screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activities, loading, otSensoryOrder, refreshedOrder, refresh, markDone, unmarkDone, skipActivity, unskipActivity, deleteScheduled, moveUp, moveDown, restoreOrder } = useActivities();
  const { userId } = useAuth();
  const [editOrder, setEditOrder] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [otName, setOtName] = useState('');
  const [otNotes, setOtNotes] = useState('');
  const [pendingReactionId, setPendingReactionId] = useState<string | null>(null);
  const [showSensoryOrderBanner, setShowSensoryOrderBanner] = useState(true);

  useFocusEffect(useCallback(() => {
    if (!userId) return;
    refresh();
    supabase.from('profiles').select('ot_name, ot_notes').eq('id', userId).single()
      .then(({ data }) => {
        setOtName(data?.ot_name ?? '');
        setOtNotes(data?.ot_notes ?? '');
      });
    AsyncStorage.getItem(`show_sensory_order_banner_${userId}`).then(v => {
      setShowSensoryOrderBanner(v === null ? true : v === 'true');
    });
  }, [userId]));

  async function handleMarkDone(scheduledId: string) {
    markDone(scheduledId);
    setPendingReactionId(scheduledId);
  }

  async function handleReact(scheduledId: string, reaction: 'liked' | 'neutral' | 'disliked' | null) {
    setPendingReactionId(null);
    if (reaction) {
      await supabase.from('scheduled_activities').update({ reaction }).eq('id', scheduledId);
    }
  }

  const doneCount = activities.filter(a => a.status === 'done').length;
  const isOtOrder = activities.map(a => a.scheduledId).join(',') === refreshedOrder.join(',');
  const hasSameTimeActivities = activities.some((a, i) =>
    a.time !== null && activities.some((b, j) => i !== j && b.time === a.time)
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoRow}>
            <LogoMark size={36} />
            <Text style={styles.wordmark}>SensoryNest</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <TouchableOpacity
              onPress={() => router.push('/week')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <CalendarIcon />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/settings')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <GearIcon />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerBottom}>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.dateEyebrow}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <Text style={styles.screenTitle}>Today's diet</Text>
          </View>
          <View style={styles.headerActions}>
            <Text style={styles.progressPillText}>{doneCount} of {activities.length} completed</Text>
            <View style={styles.headerDivider} />
            <TouchableOpacity
              onPress={() => setEditOrder(o => !o)}
              style={[styles.reorderBtn2, editOrder && styles.reorderBtnActive]}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              activeOpacity={0.6}
            >
              {!editOrder && (
                <Svg width={11} height={11} viewBox="0 0 12 12" fill="none">
                  <Path
                    d="M6 1.6v8.8M3.6 4L6 1.6 8.4 4M3.6 8L6 10.4 8.4 8"
                    stroke={Colors.dark}
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              )}
              <Text style={[styles.reorderBtnText, editOrder && { color: Colors.white }]}>
                {editOrder ? 'Done' : 'Reorder'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* OT Banner */}
      {!!otNotes?.trim() && (
        <View style={{ paddingHorizontal: 16 }}>
          <OTBanner otName={otName} otNotes={otNotes} />
        </View>
      )}

      {/* OT recommended order — standing guidance, shown with or without activities */}
      {!loading && otSensoryOrder.length > 0 && showSensoryOrderBanner && (
        <View style={styles.otOrderSticky}>
          <Text style={styles.otOrderCardLabel}>OT Recommended Order</Text>
          <View style={styles.otOrderCardRow}>
            {otSensoryOrder.map((s, i) => {
              const col = SensoryColors[s];
              return (
                <View key={`${s}-${i}`} style={styles.otOrderCardItem}>
                  <View style={[styles.otOrderCardBadge, { backgroundColor: col.bg }]}>
                    <Text style={[styles.otOrderCardNum, { color: col.text }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.otOrderCardText, { color: col.text }]}>{s}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Timeline */}
      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : activities.length === 0 ? (
        <View style={styles.emptyState}>
          <Svg width={48} height={48} viewBox="0 0 44 44" fill="none">
            <Path d="M6 30 Q22 8 38 30" stroke={Colors.primary} strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.4} />
            <Path d="M10 33 Q22 14 34 33" stroke={Colors.primary} strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.7} />
            <Path d="M14 36 Q22 20 30 36" stroke={Colors.dark} strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <Circle cx="22" cy="36" r="3.5" fill={Colors.dark} />
          </Svg>
          <Text style={styles.emptyTitle}>No activities yet</Text>
          <Text style={styles.emptySub}>Upload a home program or browse the library to add activities to today's diet.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/upload')} activeOpacity={0.85}>
            <Text style={styles.emptyBtnText}>Upload home program</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.emptyBtnOutline} onPress={() => router.push('/(tabs)/library')} activeOpacity={0.85}>
            <Text style={styles.emptyBtnOutlineText}>Browse library</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 96 }}
            showsVerticalScrollIndicator={false}
          >
          {editOrder && otSensoryOrder.length > 0 && hasSameTimeActivities && !isOtOrder && (
            <View style={styles.reorderWarning}>
              <Text style={styles.reorderWarningText}>Order differs from OT's suggestion</Text>
              <TouchableOpacity onPress={() => restoreOrder(refreshedOrder)}>
                <Text style={styles.restoreBtn}>Restore OT order</Text>
              </TouchableOpacity>
            </View>
          )}
          {editOrder && otSensoryOrder.length > 0 && hasSameTimeActivities && isOtOrder && (
            <View style={styles.reorderOk}>
              <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                <Circle cx="7" cy="7" r="6" stroke={Colors.dark} strokeWidth="1.2" />
                <Path d="M4.5 7l2 2 3-3" stroke={Colors.dark} strokeWidth="1.2" strokeLinecap="round" />
              </Svg>
              <Text style={styles.reorderOkText}>Following OT's suggested sequence</Text>
            </View>
          )}
          {activities.map((act, i) => (
            <ActivityCard
              key={act.scheduledId}
              activity={act}
              index={i}
              total={activities.length}
              editOrder={editOrder}
              onMarkDone={() => handleMarkDone(act.scheduledId)}
              onUnmarkDone={() => { unmarkDone(act.scheduledId); setPendingReactionId(null); }}
              onSkip={() => skipActivity(act.scheduledId)}
              onUnskip={() => unskipActivity(act.scheduledId)}
              pendingReaction={pendingReactionId === act.scheduledId}
              onReact={(r) => handleReact(act.scheduledId, r)}
              onDelete={() => Alert.alert(
                'Remove activity',
                `Remove "${act.name}" from today's diet?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => deleteScheduled(act.scheduledId) },
                ]
              )}
              onMoveUp={() => moveUp(i)}
              onMoveDown={() => moveDown(i)}
              canMoveUp={i > 0 && act.time === activities[i - 1].time}
              canMoveDown={i < activities.length - 1 && act.time === activities[i + 1].time}
            />
          ))}
        </ScrollView>
        </>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 24 }]}
        onPress={() => setShowSheet(true)}
        activeOpacity={0.85}
      >
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </Svg>
      </TouchableOpacity>

      {/* Add Activity Sheet */}
      <AddActivitySheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        onBrowse={() => { setShowSheet(false); router.push('/library'); }}
        onCreate={() => { setShowSheet(false); router.push('/new-activity'); }}
        onUpload={() => { setShowSheet(false); router.push('/(tabs)/upload'); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  // Header
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  headerTitleBlock: {
    flexShrink: 1,
  },
  dateEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 3,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  screenTitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
    letterSpacing: -0.2,
    fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.4,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 20,
  },
  headerDivider: {
    width: 1,
    height: 12,
    backgroundColor: Colors.border,
  },
  progressPillText: {
    fontSize: 12,
    lineHeight: 20,
    fontWeight: '500',
    color: Colors.textSoft,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  reorderBtn2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 20,
    borderRadius: 8,
  },
  reorderBtnActive: {
    backgroundColor: Colors.dark,
    paddingHorizontal: 10,
  },
  reorderBtnText: {
    fontSize: 11,
    lineHeight: 20,
    fontWeight: '600',
    color: Colors.dark,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  // OT Banner
  banner: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  bannerName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  bannerBody: {
    paddingLeft: 32,
    paddingBottom: 12,
  },
  bannerNote: {
    fontSize: 12,
    color: Colors.textMid,
    lineHeight: 19,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontStyle: 'italic',
  },
  // Timeline
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dotRail: {
    width: 24,
    alignItems: 'center',
    flexShrink: 0,
  },
  dot: {
    marginTop: 40,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  dotDone: {
    marginTop: 41,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
    borderWidth: 0,
  },
  dotNext: {
    marginTop: 39,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.amber,
    borderWidth: 0,
  },
  railLine: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    opacity: 0.4,
    minHeight: 20,
  },
  railLineDone: {
    backgroundColor: Colors.primary,
    opacity: 0.3,
  },
  reorderRail: {
    width: 24,
    alignItems: 'center',
    flexShrink: 0,
    paddingTop: 40,
    gap: 2,
  },
  reorderBtn: {
    padding: 2,
  },
  dragHandle: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: Colors.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    flex: 1,
    marginBottom: 8,
  },
  timeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 6,
  },
  missedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B54545',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  timeLabel: {
    fontSize: 11,
    color: Colors.textSoft,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 12,
    paddingHorizontal: 14,
  },
  cardNext: {
    borderColor: Colors.amber,
    shadowColor: Colors.amberBg,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  cardDone: {
    opacity: 0.65,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
    flex: 1,
    marginRight: 8,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  skippedBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSoft,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  deleteBtn: {
    padding: 2,
    marginLeft: 2,
  },
  otBadge: {
    backgroundColor: Colors.light,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  otBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.dark,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.textMid,
    lineHeight: 18,
    marginBottom: 8,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  tagDivider: {
    width: 1,
    height: 11,
    backgroundColor: Colors.border,
  },
  duration: {
    fontSize: 11,
    color: Colors.textSoft,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  reactionPromptBox: {
    marginTop: 10,
    backgroundColor: Colors.light,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 8,
  },
  reactionQuestion: {
    fontSize: 12,
    color: Colors.textMid,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  reactionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reactionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 18,
  },
  skipBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 12,
    color: Colors.textSoft,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  skipActivityBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  skipActivityText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSoft,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  markDoneBtn: {
    marginTop: 12,
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  markDoneBtnQuiet: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
  },
  undoneBtn: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
  },
  markDoneText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  markDoneTextQuiet: {
    color: Colors.dark,
  },
  undoneText: {
    color: Colors.textSoft,
  },
  // OT order card (reorder mode)
  otOrderSticky: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  otOrderCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  otOrderCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 8,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  otOrderCardRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  otOrderCardItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  otOrderCardBadge: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  otOrderCardNum: { fontSize: 10, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  otOrderCardText: { fontSize: 11, fontWeight: '500', fontFamily: 'PlusJakartaSans_500Medium' },
  // Reorder banners
  reorderWarning: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.amberBg,
    borderWidth: 1,
    borderColor: Colors.amber,
    borderRadius: 10,
    padding: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  reorderWarningText: {
    fontSize: 12,
    color: '#633806',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  restoreBtn: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.amber,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  reorderOk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  reorderOkText: {
    fontSize: 12,
    color: Colors.dark,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(74,103,65,1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 50,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: 'PlayfairDisplay_700Bold',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textSoft,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
  },
  emptyBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  emptyBtnOutline: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
  },
  emptyBtnOutlineText: {
    color: Colors.dark,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  // Bottom sheet
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  sheetSub: {
    fontSize: 12,
    color: Colors.textSoft,
    marginBottom: 20,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.light,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sheetOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sheetOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  sheetOptionSub: {
    fontSize: 12,
    color: Colors.textMid,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
});
