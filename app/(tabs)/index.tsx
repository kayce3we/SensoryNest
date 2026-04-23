import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  StyleSheet, Pressable, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors } from '@/constants/theme';
import { useActivities, type Activity } from '@/context/ActivitiesContext';
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

// ── Chevron icon ─────────────────────────────────────────────────────────────
function ChevronDown({ rotated }: { rotated: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none"
      style={{ transform: [{ rotate: rotated ? '180deg' : '0deg' }] }}>
      <Path d="M4 6l4 4 4-4" stroke={Colors.dark} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

// ── Activity card ─────────────────────────────────────────────────────────────
function ActivityCard({
  activity, index, total, editOrder, otIndex, onMarkDone, onUnmarkDone, onMoveUp, onMoveDown,
}: {
  activity: Activity;
  index: number;
  total: number;
  editOrder: boolean;
  otIndex: number;
  onMarkDone: () => void;
  onUnmarkDone: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const isNext = activity.status === 'next';
  const isDone = activity.status === 'done';
  const isLast = index === total - 1;

  return (
    <View style={styles.timelineRow}>
      {/* Rail */}
      {editOrder ? (
        <View style={styles.reorderRail}>
          <TouchableOpacity onPress={onMoveUp} disabled={index === 0} style={[styles.reorderBtn, { opacity: index === 0 ? 0.2 : 1 }]}>
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path d="M7 10V4M4 7l3-3 3 3" stroke={Colors.dark} strokeWidth="1.5" strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>
          <View style={styles.dragHandle}>
            <Svg width={12} height={10} viewBox="0 0 12 10" fill="none">
              <Path d="M1 2h10M1 5h10M1 8h10" stroke={Colors.textSoft} strokeWidth="1.5" strokeLinecap="round" />
            </Svg>
          </View>
          <TouchableOpacity onPress={onMoveDown} disabled={isLast} style={[styles.reorderBtn, { opacity: isLast ? 0.2 : 1 }]}>
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path d="M7 4v6M4 7l3 3 3-3" stroke={Colors.dark} strokeWidth="1.5" strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.dotRail}>
          <View style={[
            styles.dot,
            isDone && styles.dotDone,
            isNext && styles.dotNext,
          ]} />
          {!isLast && (
            <View style={[styles.railLine, isDone && styles.railLineDone]} />
          )}
        </View>
      )}

      {/* Card */}
      <View style={styles.cardWrapper}>
        <Text style={styles.timeLabel}>{activity.time}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.card,
            isNext && !editOrder && styles.cardNext,
            isDone && !editOrder && styles.cardDone,
            !editOrder && pressed && { opacity: 0.75 },
          ]}
          onPress={editOrder ? undefined : isDone ? onUnmarkDone : onMarkDone}
        >
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
              {activity.source === 'ot' && (
                <View style={styles.otBadge}>
                  <Text style={styles.otBadgeText}>OT #{otIndex + 1}</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.cardDesc}>{activity.desc}</Text>

          <View style={styles.cardFooter}>
            <View style={styles.cardTags}>
              <SensoryTag system={activity.system} small />
              <SourceBadge source={activity.source} />
            </View>
            <Text style={styles.duration}>{activity.duration} min</Text>
          </View>

          {!editOrder && (
            <View style={[styles.markDoneBtn, isDone && styles.undoneBtn]}>
              <Text style={[styles.markDoneText, isDone && styles.undoneText]}>
                {isDone ? 'Mark undone' : 'Mark done ✓'}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ── OT Banner ─────────────────────────────────────────────────────────────────
function OTBanner() {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.banner}>
      <TouchableOpacity style={styles.bannerHeader} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <View style={styles.bannerLeft}>
          <View style={styles.avatarCircle}>
            <Text style={{ fontSize: 14 }}>👩‍⚕️</Text>
          </View>
          <View>
            <Text style={styles.bannerName}>Dr. Maya Patel, OT</Text>
            <Text style={styles.bannerSub}>OT notes & reminders</Text>
          </View>
        </View>
        <ChevronDown rotated={open} />
      </TouchableOpacity>
      {open && (
        <View style={styles.bannerBody}>
          <Text style={styles.bannerNote}>
            "Focus on the proprioceptive activities before transitions today. Liam has been having trouble with unexpected changes – the heavy work should help regulate before school pickup."
          </Text>
          <Text style={styles.bannerDate}>Last updated: April 18, 2026</Text>
        </View>
      )}
    </View>
  );
}

// ── Add Activity Sheet ────────────────────────────────────────────────────────
function AddActivitySheet({ visible, onClose, onBrowse, onCreate }: {
  visible: boolean;
  onClose: () => void;
  onBrowse: () => void;
  onCreate: () => void;
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
      </View>
    </Modal>
  );
}

// ── Home Screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activities, loading, refresh, markDone, unmarkDone, moveUp, moveDown, restoreOrder } = useActivities();
  const [editOrder, setEditOrder] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [otOrder] = useState(() => activities.map(a => a.scheduledId));

  const doneCount = activities.filter(a => a.status === 'done').length;
  const isOtOrder = activities.map(a => a.scheduledId).join(',') === otOrder.join(',');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoRow}>
            <LogoMark size={36} />
            <Text style={styles.wordmark}>SensoryNest</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.progressPill}>
              <Text style={styles.progressPillText}>{doneCount} of {activities.length} done</Text>
            </View>
            <TouchableOpacity
              onPress={() => setEditOrder(o => !o)}
              style={[styles.reorderBtn2, editOrder && styles.reorderBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.reorderBtnText, editOrder && { color: Colors.white }]}>
                {editOrder ? 'Done' : 'Reorder'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/settings')} style={{ padding: 4 }}>
              <GearIcon />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.dateLabel}>Tuesday, April 22 · Today's diet</Text>
      </View>

      {/* OT Banner */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <OTBanner />
      </View>

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
          <Text style={styles.emptySub}>Upload an OT plan or browse the library to add activities to today's diet.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/upload')} activeOpacity={0.85}>
            <Text style={styles.emptyBtnText}>Upload OT plan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.emptyBtnOutline} onPress={() => router.push('/(tabs)/library')} activeOpacity={0.85}>
            <Text style={styles.emptyBtnOutlineText}>Browse library</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {editOrder && !isOtOrder && (
            <View style={styles.reorderWarning}>
              <Text style={styles.reorderWarningText}>Order differs from OT's suggestion</Text>
              <TouchableOpacity onPress={() => restoreOrder(otOrder)}>
                <Text style={styles.restoreBtn}>Restore OT order</Text>
              </TouchableOpacity>
            </View>
          )}
          {editOrder && isOtOrder && (
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
              otIndex={otOrder.indexOf(act.scheduledId)}
              onMarkDone={() => markDone(act.scheduledId)}
              onUnmarkDone={() => unmarkDone(act.scheduledId)}
              onMoveUp={() => moveUp(i)}
              onMoveDown={() => moveDown(i)}
            />
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      {!editOrder && (
        <TouchableOpacity
          style={[styles.fab, { bottom: 90 + insets.bottom }]}
          onPress={() => setShowSheet(true)}
          activeOpacity={0.85}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      )}

      {/* Add Activity Sheet */}
      <AddActivitySheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        onBrowse={() => { setShowSheet(false); router.push('/library'); }}
        onCreate={() => { setShowSheet(false); router.push('/new-activity'); }}
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
    paddingHorizontal: 20,
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
    marginBottom: 10,
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
    gap: 8,
  },
  progressPill: {
    backgroundColor: Colors.light,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  progressPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  reorderBtn2: {
    backgroundColor: Colors.light,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  reorderBtnActive: {
    backgroundColor: Colors.dark,
  },
  reorderBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.dark,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  dateLabel: {
    fontSize: 12,
    color: Colors.textSoft,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  // OT Banner
  banner: {
    backgroundColor: Colors.light,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 11,
    paddingHorizontal: 14,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  bannerSub: {
    fontSize: 11,
    color: Colors.textMid,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  bannerBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bannerNote: {
    fontSize: 12,
    color: Colors.textMid,
    lineHeight: 19,
    marginTop: 10,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontStyle: 'italic',
  },
  bannerDate: {
    fontSize: 11,
    color: Colors.textSoft,
    marginTop: 8,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  // Timeline
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  dotRail: {
    width: 20,
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
    backgroundColor: Colors.primary,
    borderWidth: 0,
  },
  dotNext: {
    borderColor: Colors.amber,
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
    opacity: 0.5,
  },
  reorderRail: {
    width: 20,
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
  timeLabel: {
    fontSize: 11,
    color: Colors.textSoft,
    marginBottom: 6,
    marginTop: 12,
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
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  duration: {
    fontSize: 11,
    color: Colors.textSoft,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  markDoneBtn: {
    marginTop: 10,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  undoneBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  markDoneText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  undoneText: {
    color: Colors.textSoft,
  },
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
