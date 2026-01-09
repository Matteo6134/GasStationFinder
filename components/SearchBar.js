import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from './ui/GlassView';
import { useAppTheme } from '../hooks/useAppTheme';

export const SearchBar = () => {
  const { colors } = useAppTheme();
  return (
    <GlassView style={styles.container} intensity={90}>
      <Ionicons name="search" size={20} color={colors.subText} />
      <Text style={[styles.text, { color: colors.subText }]}>Cerca stazione...</Text>
      <View style={[styles.iconCircle, { backgroundColor: colors.glassBorder }]}>
        <Ionicons name="person" size={16} color={colors.text} />
      </View>
    </GlassView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 60, left: 16, right: 16, height: 55, borderRadius: 28,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
  },
  text: { flex: 1, marginLeft: 10, fontSize: 16, fontWeight: '500' },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});