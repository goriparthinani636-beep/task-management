import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../theme/colors';
import { AppIcon, type IconName } from './AppIcon';

export function ScreenHeading({ eyebrow, title, subtitle, action, compact = false }: {
  eyebrow?: string; title: string; subtitle?: string; action?: React.ReactNode; compact?: boolean;
}) {
  return <View style={[styles.heading, compact && { marginBottom: 0 }]}><View style={{ flex: 1 }}>
    {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
    <Text style={styles.title} accessibilityRole="header">{title}</Text>
    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
  </View>{action}</View>;
}
export function SearchField({ value, onChangeText, placeholder = 'Search', label }: {
  value: string; onChangeText: (value: string) => void; placeholder?: string; label?: string;
}) {
  return <View style={styles.search}><AppIcon name="search" size={20} color={Colors.textMuted} />
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={Colors.textMuted} accessibilityLabel={label ?? placeholder}
      autoCapitalize="none" autoCorrect={false} returnKeyType="search" style={styles.searchInput} />
    {!!value && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search"
      onPress={() => onChangeText('')} style={styles.clear}><AppIcon name="close" size={17} color={Colors.textMuted} /></TouchableOpacity>}
  </View>;
}
export function EmptyState({ icon = 'folder', title, message }: { icon?: IconName; title: string; message: string }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><AppIcon name={icon} size={30} /></View>
    <Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyMessage}>{message}</Text></View>;
}
export function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{detail && <Text style={styles.detail}>{detail}</Text>}</View>;
}
const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  eyebrow: { color: Colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, marginBottom: 8 },
  title: { color: Colors.textDark, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 6 },
  search: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6,
    gap: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 16 },
  searchInput: { flex: 1, minWidth: 0, color: Colors.textDark, fontSize: 14, paddingVertical: 14 },
  clear: { minHeight: 44, minWidth: 40, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 36, backgroundColor: Colors.card, borderRadius: 20 },
  emptyIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: Colors.primarySoft, marginBottom: 16 },
  emptyTitle: { color: Colors.textDark, fontWeight: '700', fontSize: 17 },
  emptyMessage: { color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginTop: 8, fontSize: 13, maxWidth: 340 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark, flex: 1 },
  detail: { fontSize: 11, color: Colors.textMuted },
});
