import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { typography } from '@/constants/fonts';

export default function TypographyTest() {
  const { colors } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.section}>
        <Text style={[typography.heading.h2, { color: colors.text, marginBottom: 16 }]}>
          Typography System Test
        </Text>

        {/* Display Styles */}
        <Text style={[typography.heading.h3, { color: colors.text, marginBottom: 8 }]}>
          Display Styles (Clash Display)
        </Text>
        <Text style={[typography.display.large, { color: colors.text }]}>
          Display Large
        </Text>
        <Text style={[typography.display.medium, { color: colors.text }]}>
          Display Medium
        </Text>
        <Text style={[typography.display.small, { color: colors.text, marginBottom: 16 }]}>
          Display Small
        </Text>

        {/* Heading Styles */}
        <Text style={[typography.heading.h3, { color: colors.text, marginBottom: 8 }]}>
          Headings (Clash Display)
        </Text>
        <Text style={[typography.heading.h1, { color: colors.text }]}>Heading 1</Text>
        <Text style={[typography.heading.h2, { color: colors.text }]}>Heading 2</Text>
        <Text style={[typography.heading.h3, { color: colors.text }]}>Heading 3</Text>
        <Text style={[typography.heading.h4, { color: colors.text }]}>Heading 4</Text>
        <Text style={[typography.heading.h5, { color: colors.text }]}>Heading 5</Text>
        <Text style={[typography.heading.h6, { color: colors.text, marginBottom: 16 }]}>Heading 6</Text>

        {/* Body Styles */}
        <Text style={[typography.heading.h3, { color: colors.text, marginBottom: 8 }]}>
          Body Text (Sora)
        </Text>
        <Text style={[typography.body.large, { color: colors.text }]}>
          Body Large - This is how large body text looks in the Sora font family.
        </Text>
        <Text style={[typography.body.medium, { color: colors.text }]}>
          Body Medium - This is how medium body text looks in the Sora font family.
        </Text>
        <Text style={[typography.body.small, { color: colors.text, marginBottom: 16 }]}>
          Body Small - This is how small body text looks in the Sora font family.
        </Text>

        {/* Label Styles */}
        <Text style={[typography.heading.h3, { color: colors.text, marginBottom: 8 }]}>
          Labels (Sora)
        </Text>
        <Text style={[typography.label.large, { color: colors.text }]}>Label Large</Text>
        <Text style={[typography.label.medium, { color: colors.text }]}>Label Medium</Text>
        <Text style={[typography.label.small, { color: colors.text, marginBottom: 16 }]}>Label Small</Text>

        {/* Caption Styles */}
        <Text style={[typography.heading.h3, { color: colors.text, marginBottom: 8 }]}>
          Captions (Sora)
        </Text>
        <Text style={[typography.caption.large, { color: colors.textSecondary }]}>Caption Large</Text>
        <Text style={[typography.caption.medium, { color: colors.textSecondary, marginBottom: 16 }]}>Caption Medium</Text>

        {/* Button Styles */}
        <Text style={[typography.heading.h3, { color: colors.text, marginBottom: 8 }]}>
          Button Text (Sora)
        </Text>
        <View style={[styles.buttonExample, { backgroundColor: colors.primary, marginBottom: 8 }]}>
          <Text style={[typography.button.large, { color: colors.white }]}>Button Large</Text>
        </View>
        <View style={[styles.buttonExample, { backgroundColor: colors.primary, marginBottom: 8 }]}>
          <Text style={[typography.button.medium, { color: colors.white }]}>Button Medium</Text>
        </View>
        <View style={[styles.buttonExample, { backgroundColor: colors.primary, marginBottom: 16 }]}>
          <Text style={[typography.button.small, { color: colors.white }]}>Button Small</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  buttonExample: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
}); 