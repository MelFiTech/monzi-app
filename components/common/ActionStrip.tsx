import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Pill } from './Pill';

interface Action {
  id: string;
  title: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  iconName?: keyof typeof FontAwesome.glyphMap;
}

interface ActionStripProps {
  actions: Action[];
  visible?: boolean;
}

export const ActionStrip: React.FC<ActionStripProps> = ({
  actions,
  visible = true,
}) => {
  if (!visible || actions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {actions.map((action) => (
        <Pill
          key={action.id}
          title={action.title}
          onPress={action.onPress}
          active={action.active}
          disabled={action.disabled}
          iconName={action.iconName}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column', // Stack vertically
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8, // Add vertical padding for better touch area
    gap: 12, // Increased gap for easier tapping and better spacing
  },
});
