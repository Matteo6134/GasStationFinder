import { useColorScheme } from 'react-native';
import { COLORS } from '../constants/Colors'; // Import corretto dalla root

export const useAppTheme = () => {
  const theme = useColorScheme();
  const isDark = theme === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;
  return { isDark, theme, colors, accent: COLORS.accent, brands: COLORS.brands };
};