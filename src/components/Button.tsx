// src/components/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../theme/colors';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  color?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export const Button: React.FC<Props> = ({
  title,
  onPress,
  loading,
  disabled,
  color,
  variant = 'primary',
}) => {
  const foreground = variant === 'primary' ? Colors.card : (color ?? Colors.primary);
  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor:
            variant === 'ghost'
              ? 'transparent'
              : variant === 'secondary'
                ? Colors.primarySoft
                : (color ?? Colors.primary),
        },
        disabled || loading ? styles.disabled : null,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text style={[styles.text, { color: foreground }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    paddingVertical: 15,
    paddingHorizontal: 18,
    backgroundColor: Colors.primary,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
