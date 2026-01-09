import React from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useApp } from '../../context/AppContext';
import { GlassView } from '../../components/GlassView';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { settings, updateSetting, theme } = useApp();

  const toggleLang = () => {
      const newLang = settings.language === 'it' ? 'en' : 'it';
      updateSetting('language', newLang);
      Alert.alert("Lingua Cambiata", newLang === 'it' ? "Impostato su Italiano" : "Set to English");
  };

  const SettingRow = ({ label, value, onToggle }) => (
    <GlassView 
        style={{marginBottom: 12, borderRadius: 16}} 
        glassEffectStyle="regular"
        isInteractive={true} // NECESSARIO per far funzionare lo Switch
    >
        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding: 16}}>
            <Text style={{color: theme.text, fontSize: 17, fontWeight:'600', fontFamily: theme.fontBold}}>{label}</Text>
            <Switch value={value} onValueChange={onToggle} trackColor={{false: '#767577', true: theme.tintColor}} />
        </View>
    </GlassView>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.isDark ? '#000' : '#F2F2F7' }} contentContainerStyle={{ paddingTop: 80, paddingHorizontal: 16, paddingBottom: 100 }}>
      <Text style={{ fontSize: 34, fontFamily: theme.fontBold, color: theme.text, marginBottom: 30 }}>Opzioni</Text>
      
      <Text style={{color: theme.subText, marginBottom: 10, fontWeight:'700', fontSize: 13, marginLeft: 4, fontFamily: theme.fontBold}}>NOTIFICHE</Text>
      <SettingRow label="Avviso Prossimità (500m)" value={settings.notifProximity} onToggle={(v) => updateSetting('notifProximity', v)} />
      <SettingRow label="Avviso Prezzi Bassi" value={settings.notifPrice} onToggle={(v) => updateSetting('notifPrice', v)} />

      <Text style={{color: theme.subText, marginBottom: 10, fontWeight:'700', fontSize: 13, marginLeft: 4, marginTop: 20, fontFamily: theme.fontBold}}>LINGUA</Text>
      <GlassView 
        style={{marginBottom: 12, borderRadius: 16}} 
        glassEffectStyle="regular"
        isInteractive={true} // NECESSARIO per il TouchableOpacity
      >
        <TouchableOpacity onPress={toggleLang} style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding: 16}}>
            <Text style={{color: theme.text, fontSize: 17, fontWeight:'600', fontFamily: theme.fontBold}}>Lingua App</Text>
            <View style={{flexDirection:'row', alignItems:'center'}}>
                <Text style={{color: theme.subText, fontSize: 17, marginRight: 8, fontFamily: theme.fontBold}}>
                    {settings.language === 'it' ? 'Italiano' : 'English'}
                </Text>
                <Ionicons name="swap-horizontal" color={theme.subText} size={20} />
            </View>
        </TouchableOpacity>
      </GlassView>
    </ScrollView>
  );
}