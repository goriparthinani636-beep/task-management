import React from 'react';
import Svg, { Path } from 'react-native-svg';

const paths = {
  Dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  Employees: 'M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  Tasks: 'M9 5H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4 M9 2h6v6H9z M8 15l3 3 5-6',
  Profile: 'M20 21v-2a7 7 0 0 0-7-7h-2a7 7 0 0 0-7 7v2 M16 5a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  FileUpload: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M12 18v-7 M9 14l3-3 3 3',
  Attendance: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z M9 12l2 2 4-4',
} as const;

export function TabIcon({ name, color, size, focused }: {
  name: keyof typeof paths;
  color: string;
  size: number;
  focused: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={focused ? 2.2 : 1.7}
      strokeLinecap="round" strokeLinejoin="round" accessible={false}>
      <Path d={paths[name]} />
    </Svg>
  );
}
