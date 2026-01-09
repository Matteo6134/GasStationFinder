import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
// Importiamo dalla libreria expo-glass-effect
import { GlassView as ExpoGlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

export const GlassView = ({ 
  style, 
  glassEffectStyle = 'regular', 
  intensity, // Ignorato dalla nuova API, mantenuto per compatibilità interfaccia
  isInteractive = false, // Default false come da docs
  children 
}) => {
  // Controlliamo se Liquid Glass è disponibile (iOS 26+)
  const isSupported = isLiquidGlassAvailable();

  // MAPPING: 'prominent' non esiste più nelle nuove API, lo mappiamo a 'regular'
  // Le opzioni valide sono solo: 'regular' | 'clear'
  const validStyle = glassEffectStyle === 'prominent' ? 'regular' : glassEffectStyle;

  if (Platform.OS === 'ios' && isSupported) {
    return (
      <ExpoGlassView 
        style={[styles.container, style]} 
        glassEffectStyle={validStyle}
        isInteractive={isInteractive} // Fondamentale per bottoni/input
      >
        {children}
      </ExpoGlassView>
    );
  }
  
  // FALLBACK: Per Android o iOS < 26
  const getFallbackStyle = () => {
    switch (glassEffectStyle) {
      case 'prominent': return styles.fallbackProminent;
      case 'clear': return styles.fallbackClear;
      default: return styles.fallbackRegular;
    }
  };
  
  return (
    <View style={[styles.container, getFallbackStyle(), style]}>
      {children}
    </View>
  );
};

// Wrapper helper
export const GlassCard = (props) => <GlassView {...props} />;

const styles = StyleSheet.create({
  container: { 
    overflow: 'hidden',
  },
  // Stili fallback simulano l'effetto
  fallbackRegular: {
    backgroundColor: Platform.select({ ios: 'rgba(255,255,255,0.75)', android: '#F5F5F5' }),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  fallbackProminent: {
    backgroundColor: Platform.select({ ios: 'rgba(255,255,255,0.95)', android: '#FFFFFF' }),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fallbackClear: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  }
});