import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';

export default function RulesModal({ visible, onClose, title, body }: { visible: boolean; onClose: () => void; title: string; body: string }) {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }} onPress={onClose}>
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.bg, borderWidth: 2.5, borderColor: colors.border, borderRadius: 20, padding: 22, maxWidth: 340, width: '100%' }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.ink, marginBottom: 12 }}>{title}</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.ink, lineHeight: 19 }}>{body}</Text>
          </ScrollView>
          <Pressable onPress={onClose} style={{ marginTop: 18, paddingVertical: 10, backgroundColor: accent.coral, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('settings_help_close')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
