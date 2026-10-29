// src/components/Input.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors } from '../theme/colors';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export const Input: React.FC<Props> = ({ label, error, style, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, focused ? styles.inputFocused : null, error ? styles.inputError : null, style]}
        accessibilityLabel={label}
        placeholderTextColor={Colors.textMuted}
        {...props}
        onFocus={event => { setFocused(true); props.onFocus?.(event); }}
        onBlur={event => { setFocused(false); props.onBlur?.(event); }}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 9,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    fontSize: 15,
    color: Colors.textDark,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputFocused: { borderColor: Colors.primary, backgroundColor: Colors.card },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
  },
});
