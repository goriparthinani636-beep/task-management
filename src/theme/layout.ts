import { Colors } from './colors';

export const Layout = {
  card: {
    backgroundColor: Colors.card, borderRadius: 18, borderWidth: 1,
    borderColor: Colors.border, shadowColor: '#182B49', shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 1,
  },
  input: {
    minHeight: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    backgroundColor: Colors.surface, color: Colors.textDark,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
};
