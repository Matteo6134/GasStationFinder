import React from 'react';
import { View, Text, FlatList, TouchableOpacity, useColorScheme, Platform } from 'react-native';
import { useApp } from '../../context/AppContext';
import { GlassView } from '../../components/GlassView';
import { Ionicons } from '@expo/vector-icons';

// Font Fix
const FONT_BOLD = Platform.OS === 'ios' ? 'Avenir-Heavy' : 'Roboto-Bold';

export default function FavoritesScreen() {
  const { favorites, theme, settings, toggleFavorite } = useApp();
  const isDark = useColorScheme() === 'dark';

  return (
    // FIX: Aggiunto backgroundColor dinamico per evitare flash bianco
    <View style={{ flex: 1, paddingTop: 80, paddingHorizontal: 16, backgroundColor: isDark ? '#000' : '#F2F2F7' }}>
      <Text style={{ fontSize: 34, fontFamily: FONT_BOLD, color: theme.text, marginBottom: 20 }}>Preferiti</Text>
      
      {favorites.length === 0 ? (
          <GlassView style={{padding: 40, alignItems:'center', borderRadius: 20}} glassEffectStyle="regular">
              <Ionicons name="heart-dislike-outline" size={50} color={theme.subText} />
              <Text style={{color: theme.subText, marginTop: 10, fontSize: 16}}>Nessun distributore salvato.</Text>
          </GlassView>
      ) : (
          <FlatList
            data={favorites}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 120 }}
            renderItem={({ item }) => (
                <TouchableOpacity onPress={() => {/* Logica navigazione futura */}}>
                    <GlassView 
                        style={{marginBottom: 12, borderRadius: 20, overflow:'hidden'}} 
                        glassEffectStyle="regular"
                        isInteractive={true} // Permette i tap sulla lista e sul cestino
                    >
                        <View style={{padding: 16, flexDirection:'row', alignItems:'center'}}>
                            <View style={{width:40, height:40, borderRadius:20, backgroundColor:'#ffcc00', justifyContent:'center', alignItems:'center', marginRight:12}}>
                                <Text style={{fontWeight:'bold', color:'white', fontSize:18}}>{item.title.charAt(0)}</Text>
                            </View>
                            <View style={{flex:1}}>
                                <Text style={{color: theme.text, fontWeight:'bold', fontSize: 17, fontFamily: FONT_BOLD}}>{item.title}</Text>
                                <Text style={{color: theme.subText, fontSize: 13}}>{item.address}</Text>
                            </View>
                            <View style={{alignItems:'flex-end'}}>
                                <Text style={{fontSize: 18, fontWeight:'900', color: theme.text}}>
                                    {item.prices[settings.fuelType]?.toFixed(3)}
                                </Text>
                                <TouchableOpacity onPress={() => toggleFavorite(item)} style={{marginTop: 5, padding: 5}}>
                                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </GlassView>
                </TouchableOpacity>
            )}
          />
      )}
    </View>
  );
}