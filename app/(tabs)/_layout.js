import React from 'react';
import { Stack } from 'expo-router';
import { AppProvider } from '../../context/AppContext';

export default function Layout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="settings" />
      </Stack>
    </AppProvider>
  );
}