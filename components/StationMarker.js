import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { useAppTheme } from '../hooks/useAppTheme';

export const StationMarker = ({ station, onPress }) => {
  const { colors, brands } = useAppTheme();
  const displayPrice = station.prices.unleaded || station.prices.electric;
  const brandColor = brands[station.brand] || brands.default;

  return (
    <Marker coordinate={station} onPress={onPress}>
      <View style={styles.wrapper}>
        <View style={[styles.bubble, { backgroundColor: colors.markerBg }]}>
          <View style={[styles.dot, { backgroundColor: brandColor }]} />
          <Text style={[styles.price, { color: colors.text }]}>{displayPrice?.toFixed(2)}</Text>
        </View>
        <View style={[styles.arrow, { borderTopColor: colors.markerBg }]} />
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  bubble: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  price: { fontSize: 13, fontWeight: '700' },
  arrow: {
    width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1,
  },
});