import { Colors } from './colors';

export const Layout = {
  card: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.ink,
    shadowOpacity: 0.045,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 2,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: Colors.card,
    color: Colors.textDark,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  page: {
    padding: 18,
    paddingBottom: 38,
    gap: 18,
    width: '100%' as const,
    maxWidth: 1000,
    alignSelf: 'center' as const,
  },
};
