import { Colors } from './colors';

export const Layout = {
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.ink,
    shadowOpacity: 0.025,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 1,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    color: Colors.textDark,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  page: {
    padding: 20,
    paddingBottom: 36,
    gap: 20,
    width: '100%' as const,
    maxWidth: 1000,
    alignSelf: 'center' as const,
  },
};
