import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassView } from './GlassView';
import { useAppTheme } from '../hooks/useAppTheme';
import * as Linking from 'expo-linking';

const PriceRow = ({ label, price, icon, color, textColor }) => {
  if (!price) return null;
  return (
    <View style={styles.priceRow}>
      <View style={styles.fuelBadge}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={[styles.fuelLabel, { color: textColor }]}>{label}</Text>
      </View>
      <Text style={[styles.priceValue, { color: textColor }]}>{price.toFixed(3)} €</Text>
    </View>
  );
};

export const StationCard = ({ station, onClose }) => {
  const { colors, accent } = useAppTheme();
  const navigateToStation = () => {
    const url = `maps:0,0?q=${station.title}@${station.latitude},${station.longitude}`;
    Linking.openURL(url);
  };

  return (
    <GlassView style={styles.card} intensity={100} glassEffectStyle="regular" isInteractive={true}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>{station.title}</Text>
          <Text style={[styles.address, { color: colors.subText }]}>{station.address}</Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close-circle" size={28} color={colors.subText} />
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        <PriceRow label="Benzina" price={station.prices.unleaded} icon="water" color="#2ecc71" textColor={colors.text} />
        <PriceRow label="Diesel" price={station.prices.diesel} icon="water" color="#34495e" textColor={colors.text} />
        <PriceRow label="GPL" price={station.prices.gpl} icon="flame" color="#e67e22" textColor={colors.text} />
        <PriceRow label="Elettrico" price={station.prices.electric} icon="flash" color="#f1c40f" textColor={colors.text} />
      </ScrollView>
      <TouchableOpacity onPress={navigateToStation} activeOpacity={0.8}>
        <LinearGradient
          colors={[accent, '#0055A4']}
          start={{x: 0, y: 0}} end={{x: 1, y: 0}}
          style={styles.button}
        >
          <Ionicons name="car-sport" size={20} color="white" style={{ marginRight: 10 }} />
          <Text style={styles.btnText}>Naviga ora</Text>
        </LinearGradient>
      </TouchableOpacity>
    </GlassView>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute', bottom: 30, left: 16, right: 16, borderRadius: 32, padding: 24, maxHeight: 380,
    shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20,
  },
  handle: { width: 40, height: 4, backgroundColor: 'rgba(150,150,150,0.5)', borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  address: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1, backgroundColor: 'rgba(150,150,150,0.2)', marginVertical: 15 },
  list: { maxHeight: 120, marginBottom: 20 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  fuelBadge: { flexDirection: 'row', alignItems: 'center' },
  fuelLabel: { marginLeft: 8, fontSize: 16, fontWeight: '600' },
  priceValue: { fontSize: 16, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  button: { height: 56, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: 'white', fontSize: 18, fontWeight: '700' },
});