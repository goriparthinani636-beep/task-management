import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../theme/colors';

const paths = {
  search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  plus: 'M12 5v14 M5 12h14',
  close: 'M6 6l12 12 M18 6L6 18',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  chevron: 'M9 5l7 7-7 7',
  check: 'M5 12l4 4L19 6',
  clock: 'M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M17 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.9',
  task: 'M9 5H5a2 2 0 0 0-2 2v13h18V7a2 2 0 0 0-2-2h-4 M9 2h6v6H9z M8 14l3 3 5-6',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0 M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  shield: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11 M9 12l2 2 4-4',
  folder: 'M3 7V4h6l3 3h9v13H3z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  camera: 'M3 6h4l2-3h6l2 3h4v15H3z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  mail: 'M3 5h18v14H3z M3 5l9 7 9-7',
  logout: 'M9 4H3v16h6 M10 12h12 M17 7l5 5-5 5',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
} as const;
export type IconName = keyof typeof paths;
export function AppIcon({
  name,
  size = 22,
  color = Colors.primary,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
    >
      <Path d={paths[name]} />
    </Svg>
  );
}
