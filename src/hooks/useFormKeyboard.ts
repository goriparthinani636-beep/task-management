import { useMemo, useRef } from 'react';
import type { Ref } from 'react';
import type { TextInputInstance, TextInputProps } from 'react-native';

type FormKeyboardProps = Pick<
  TextInputProps,
  'onSubmitEditing' | 'returnKeyType' | 'submitBehavior'
> & { ref: Ref<TextInputInstance> };

/** Gives form inputs a Next key and focuses the following field. */
export function useFormKeyboard(fieldCount: number) {
  const fields = useRef<(TextInputInstance | null)[]>([]);
  return useMemo(
    () =>
      Array.from({ length: fieldCount }, (_, index): FormKeyboardProps => ({
        ref: (input) => {
          fields.current[index] = input;
        },
        returnKeyType: index < fieldCount - 1 ? 'next' : 'done',
        submitBehavior: index < fieldCount - 1 ? 'submit' : 'blurAndSubmit',
        onSubmitEditing: () => fields.current[index + 1]?.focus(),
      })),
    [fieldCount],
  );
}
