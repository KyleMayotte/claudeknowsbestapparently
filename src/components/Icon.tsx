// Icon component - Custom SVG icons replacing emojis
// Steve Jobs: "Design is not just what it looks like. Design is how it works."
// Crisp, scalable, professional icons that match our design system

import React from 'react';
import Svg, { Path, Circle, Rect, Line, G, Polygon } from 'react-native-svg';
import { ViewStyle } from 'react-native';

export type IconName =
  | 'dumbbell'        // Workout/strength
  | 'home'            // Home tab
  | 'chart'           // Progress/analytics
  | 'user'            // Profile
  | 'users'           // Social/friends
  | 'settings'        // Preferences
  | 'fire'            // Streak
  | 'trophy'          // Achievement/PR
  | 'heart'           // Health/wellness
  | 'calendar'        // Schedule
  | 'lightning'       // Quick action
  | 'plus'            // Add
  | 'check'           // Complete
  | 'chevron-right'   // Navigate forward
  | 'chevron-left'    // Navigate back
  | 'ai-sparkle'      // AI features
  | 'clipboard'       // AI Program/Plans
  | 'atlas-robot'     // Atlas mascot
  | 'microphone'      // Voice input
  | 'barbell-plates'; // Plate calculator

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: ViewStyle;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#000000',
  strokeWidth = 2,
  style
}) => {
  const viewBox = `0 0 24 24`;

  const renderIcon = () => {
    switch (name) {
      case 'dumbbell':
        return (
          <>
            {/* Left weight plates - filled and larger */}
            <Rect x="1" y="7" width="5" height="10" rx="1.5" fill={color} />
            <Rect x="2" y="6" width="3" height="12" rx="1" fill={color} opacity="0.6" />

            {/* Right weight plates - filled and larger */}
            <Rect x="18" y="7" width="5" height="10" rx="1.5" fill={color} />
            <Rect x="19" y="6" width="3" height="12" rx="1" fill={color} opacity="0.6" />

            {/* Center bar - thicker and more prominent */}
            <Rect x="6" y="10" width="12" height="4" rx="2" fill={color} />
          </>
        );

      case 'home':
        return (
          <Path
            d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'chart':
        return (
          <>
            {/* Bar chart - more visible than line chart */}
            <Rect x="4" y="14" width="3" height="7" rx="1" fill={color} />
            <Rect x="9" y="10" width="3" height="11" rx="1" fill={color} />
            <Rect x="14" y="6" width="3" height="15" rx="1" fill={color} />
            <Rect x="19" y="12" width="3" height="9" rx="1" fill={color} opacity="0.7" />
          </>
        );

      case 'user':
        return (
          <>
            <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={strokeWidth} fill="none" />
            <Path
              d="M6 21V19C6 16.7909 7.79086 15 10 15H14C16.2091 15 18 16.7909 18 19V21"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
            />
          </>
        );

      case 'users':
        return (
          <>
            {/* Left person - filled */}
            <Circle cx="9" cy="7" r="3" fill={color} />
            <Path
              d="M3 21V19C3 17.3431 4.34315 16 6 16H12C13.6569 16 15 17.3431 15 19V21"
              fill={color}
            />
            {/* Right person - slightly transparent for depth */}
            <Circle cx="16" cy="8" r="2.5" fill={color} opacity="0.7" />
            <Path
              d="M21 21V19.5C21 18.1193 19.8807 17 18.5 17H17C17 17 15.5 17 15.5 19V21"
              fill={color}
              opacity="0.7"
            />
          </>
        );

      case 'settings':
        return (
          <Path
            d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"
            fill={color}
          />
        );

      case 'fire':
        return (
          <Path
            d="M12 2C12 2 7 6 7 12C7 15.3137 9.68629 18 13 18C16.3137 18 19 15.3137 19 12C19 8 15 6 15 6C15 6 16 8 14 10C14 10 13 5 12 2Z"
            fill={color}
            stroke={color}
            strokeWidth={strokeWidth * 0.5}
            strokeLinejoin="round"
          />
        );

      case 'trophy':
        return (
          <>
            <Path
              d="M6 4H18M8 4V8C8 10.2091 9.79086 12 12 12C14.2091 12 16 10.2091 16 8V4"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Path
              d="M12 12V16M9 20H15M8 4H7C5.89543 4 5 4.89543 5 6V7C5 8.10457 5.89543 9 7 9H8M16 4H17C18.1046 4 19 4.89543 19 6V7C19 8.10457 18.1046 9 17 9H16"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Rect x="9" y="18" width="6" height="3" rx="1" stroke={color} strokeWidth={strokeWidth} fill="none" />
          </>
        );

      case 'heart':
        return (
          <Path
            d="M12 21L10.55 19.7051C5.4 15.1242 2 12.1029 2 8.39509C2 5.37384 4.42 3 7.5 3C9.24 3 10.91 3.79455 12 5.08159C13.09 3.79455 14.76 3 16.5 3C19.58 3 22 5.37384 22 8.39509C22 12.1029 18.6 15.1242 13.45 19.7149L12 21Z"
            fill={color}
          />
        );

      case 'calendar':
        return (
          <>
            <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={strokeWidth} fill="none" />
            <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={strokeWidth} />
            <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
            <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          </>
        );

      case 'lightning':
        return (
          <Path
            d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
            fill={color}
            stroke={color}
            strokeWidth={strokeWidth * 0.5}
            strokeLinejoin="round"
          />
        );

      case 'plus':
        return (
          <>
            <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
            <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          </>
        );

      case 'check':
        return (
          <Path
            d="M5 12L10 17L20 7"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'chevron-right':
        return (
          <Path
            d="M9 18L15 12L9 6"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'chevron-left':
        return (
          <Path
            d="M15 18L9 12L15 6"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'ai-sparkle':
        return (
          <>
            <Path
              d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z"
              fill={color}
            />
            <Path
              d="M19 4L19.5 5.5L21 6L19.5 6.5L19 8L18.5 6.5L17 6L18.5 5.5L19 4Z"
              fill={color}
            />
            <Path
              d="M6 16L6.5 17.5L8 18L6.5 18.5L6 20L5.5 18.5L4 18L5.5 17.5L6 16Z"
              fill={color}
            />
          </>
        );

      case 'clipboard':
        return (
          <>
            {/* Clipboard board - filled */}
            <Rect x="6" y="4" width="12" height="17" rx="2" fill={color} opacity="0.9" />
            {/* Paper/list on clipboard */}
            <Rect x="8" y="6" width="8" height="13" rx="1" fill={color === '#007AFF' || color === '#8E8E93' ? '#FFFFFF' : '#F8F9FA'} />
            {/* Clip at top - prominent */}
            <Rect x="10" y="2" width="4" height="4" rx="1" fill={color} />
            {/* List lines on paper */}
            <Line x1="10" y1="9" x2="14" y2="9" stroke={color} strokeWidth="1" opacity="0.4" />
            <Line x1="10" y1="12" x2="14" y2="12" stroke={color} strokeWidth="1" opacity="0.4" />
            <Line x1="10" y1="15" x2="14" y2="15" stroke={color} strokeWidth="1" opacity="0.4" />
          </>
        );

      case 'atlas-robot':
        return (
          <>
            {/* Simple cute robot - Duolingo-inspired minimalism */}
            {/* Robot head - large rounded square (main focus) */}
            <Rect x="6" y="5" width="12" height="12" rx="3" fill={color} />

            {/* Antenna - single simple antenna */}
            <Circle cx="12" cy="3" r="1.5" fill={color} />
            <Line x1="12" y1="4.5" x2="12" y2="5" stroke={color} strokeWidth="2" />

            {/* Eyes - big cute circles */}
            <Circle cx="10" cy="10" r="2" fill="#FFFFFF" />
            <Circle cx="14" cy="10" r="2" fill="#FFFFFF" />
            <Circle cx="10" cy="10" r="1" fill="#000000" opacity="0.8" />
            <Circle cx="14" cy="10" r="1" fill="#000000" opacity="0.8" />

            {/* Simple smile - curved line */}
            <Path
              d="M9 13 Q12 15 15 13"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />

            {/* Simple body - small base */}
            <Rect x="9" y="17" width="6" height="4" rx="1.5" fill={color} opacity="0.8" />
          </>
        );

      case 'microphone':
        return (
          <>
            {/* Classic microphone - clear and recognizable */}
            {/* Microphone capsule/head - larger and more prominent */}
            <Rect x="9" y="4" width="6" height="9" rx="3" fill={color} />

            {/* Mesh grille effect - horizontal lines */}
            <Line x1="10" y1="6" x2="14" y2="6" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" />
            <Line x1="10" y1="8" x2="14" y2="8" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" />
            <Line x1="10" y1="10" x2="14" y2="10" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" />

            {/* Mic stand/handle - clearer connection */}
            <Line x1="12" y1="13" x2="12" y2="19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />

            {/* Base - wider for stability */}
            <Line x1="8" y1="19" x2="16" y2="19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'barbell-plates':
        return (
          <>
            {/* Barbell with weight plates - top-down view */}
            {/* Left weight plates - multiple plates stacked */}
            <Rect x="2" y="8" width="3" height="8" rx="0.5" fill={color} />
            <Rect x="3" y="7" width="2" height="10" rx="0.5" fill={color} opacity="0.7" />

            {/* Left collar */}
            <Rect x="5" y="9.5" width="1" height="5" rx="0.3" fill={color} opacity="0.9" />

            {/* Barbell bar - horizontal */}
            <Rect x="6" y="10.5" width="12" height="3" rx="1.5" fill={color} />

            {/* Right collar */}
            <Rect x="18" y="9.5" width="1" height="5" rx="0.3" fill={color} opacity="0.9" />

            {/* Right weight plates - multiple plates stacked */}
            <Rect x="19" y="8" width="3" height="8" rx="0.5" fill={color} />
            <Rect x="19" y="7" width="2" height="10" rx="0.5" fill={color} opacity="0.7" />

            {/* Weight markings on plates */}
            <Circle cx="3.5" cy="12" r="0.5" fill="#FFFFFF" opacity="0.4" />
            <Circle cx="20.5" cy="12" r="0.5" fill="#FFFFFF" opacity="0.4" />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Svg
      width={size}
      height={size}
      viewBox={viewBox}
      style={style}
    >
      {renderIcon()}
    </Svg>
  );
};
