import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { typography } from '@/constants/fonts';

export function ThemeDemo() {
  const { colors, isDark, colorScheme } = useTheme();

  return (
    <ScrollView 
      style={{ backgroundColor: colors.background, flex: 1, padding: 24 }}
    >
      {/* Theme Status */}
      <View style={{ 
        marginBottom: 32, 
        padding: 16, 
        borderRadius: 8, 
        borderWidth: 1,
        borderColor: colors.border, 
        backgroundColor: colors.surface 
      }}>
        <Text style={{ 
          fontSize: 20, 
          fontWeight: '600',
          color: colors.text,
          marginBottom: 8
        }}>
          Current Theme: {colorScheme}
        </Text>
        <Text style={{ 
          fontSize: 16,
          color: colors.textSecondary 
        }}>
          Dark mode: {isDark ? 'Enabled' : 'Disabled'}
        </Text>
      </View>

      {/* Typography Examples */}
      <View className="mb-8">
        <Text style={[typography.heading.h2, { color: colors.text }]} className="mb-4">
          Typography Examples
        </Text>
        
        <Text style={[typography.display.large, { color: colors.text }]} className="mb-2">
          Display Large (Clash Display)
        </Text>
        
        <Text style={[typography.heading.h1, { color: colors.text }]} className="mb-2">
          Heading H1 (Clash Display)
        </Text>
        
        <Text style={[typography.heading.h3, { color: colors.text }]} className="mb-2">
          Heading H3 (Clash Display)
        </Text>
        
        <Text style={[typography.body.large, { color: colors.text }]} className="mb-2">
          Body Large (Sora Regular)
        </Text>
        
        <Text style={[typography.body.medium, { color: colors.textSecondary }]} className="mb-2">
          Body Medium (Sora Regular)
        </Text>
        
        <Text style={[typography.label.medium, { color: colors.textTertiary }]} className="mb-4">
          Label Medium (Sora Medium)
        </Text>
      </View>

      {/* Color Examples */}
      <View className="mb-8">
        <Text style={[typography.heading.h2, { color: colors.text }]} className="mb-4">
          Color Palette
        </Text>
        
        {/* Primary Colors */}
        <Text style={[typography.label.large, { color: colors.text }]} className="mb-2">
          Primary Colors
        </Text>
        <View className="flex-row flex-wrap mb-4">
          <ColorSwatch color={colors.primary} label="Primary" />
          <ColorSwatch color={colors.primaryLight} label="Primary Light" />
          <ColorSwatch color={colors.primaryDark} label="Primary Dark" />
        </View>
        
        {/* Semantic Colors */}
        <Text style={[typography.label.large, { color: colors.text }]} className="mb-2">
          Semantic Colors
        </Text>
        <View className="flex-row flex-wrap mb-4">
          <ColorSwatch color={colors.success} label="Success" />
          <ColorSwatch color={colors.error} label="Error" />
          <ColorSwatch color={colors.warning} label="Warning" />
          <ColorSwatch color={colors.info} label="Info" />
        </View>
        
        {/* Surface Colors */}
        <Text style={[typography.label.large, { color: colors.text }]} className="mb-2">
          Surface Colors
        </Text>
        <View className="flex-row flex-wrap mb-4">
          <ColorSwatch color={colors.background} label="Background" />
          <ColorSwatch color={colors.surface} label="Surface" />
          <ColorSwatch color={colors.surfaceVariant} label="Surface Variant" />
        </View>
      </View>

      {/* TailwindCSS Examples */}
      <View className="mb-8">
        <Text style={[typography.heading.h2, { color: colors.text }]} className="mb-4">
          TailwindCSS Classes
        </Text>
        
        <View className="bg-primary-500 p-4 rounded-lg mb-2">
          <Text className="text-white font-clash-bold text-lg">
            Primary Background with Clash Display Bold
          </Text>
        </View>
        
        <View className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-2">
          <Text className="text-gray-900 dark:text-gray-100 font-sora-medium">
            Responsive background with Sora Medium
          </Text>
        </View>
        
        <View className="border border-gray-200 dark:border-gray-700 p-4 rounded-xl">
          <Text className="text-gray-600 dark:text-gray-300 font-sora text-sm">
            Border with responsive colors
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

interface ColorSwatchProps {
  color: string;
  label: string;
}

function ColorSwatch({ color, label }: ColorSwatchProps) {
  const { colors } = useTheme();
  
  return (
    <View className="mr-3 mb-3">
      <View 
        className="w-16 h-16 rounded-lg border mb-1"
        style={{ backgroundColor: color, borderColor: colors.border }}
      />
      <Text style={[typography.caption.medium, { color: colors.textSecondary }]} className="text-center text-xs">
        {label}
      </Text>
    </View>
  );
}

export default ThemeDemo; 