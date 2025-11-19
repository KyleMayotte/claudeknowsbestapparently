import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Defs, LinearGradient, Stop, Path } from 'react-native-svg';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  lineColor?: string;
  fillColor?: string;
  showDots?: boolean;
  showFill?: boolean;
  strokeWidth?: number;
}

const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 100,
  height = 40,
  lineColor = '#4CAF50',
  fillColor = '#4CAF50',
  showDots = false,
  showFill = true,
  strokeWidth = 2,
}) => {
  if (!data || data.length < 2) {
    return <View style={{ width, height }} />;
  }

  // Calculate min and max values
  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const range = maxValue - minValue || 1; // Avoid division by zero

  // Calculate points
  const padding = 4;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const stepX = usableWidth / (data.length - 1);

  const points = data.map((value, index) => {
    const x = padding + index * stepX;
    const y = padding + usableHeight - ((value - minValue) / range) * usableHeight;
    return { x, y, value };
  });

  // Create polyline points string
  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  // Create path for filled area
  const pathData = showFill
    ? `M ${padding},${height - padding} ${points.map(p => `L ${p.x},${p.y}`).join(' ')} L ${width - padding},${height - padding} Z`
    : '';

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={fillColor} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={fillColor} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* Filled area */}
        {showFill && (
          <Path
            d={pathData}
            fill="url(#sparklineGradient)"
          />
        )}

        {/* Line */}
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={lineColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {showDots && points.map((point, index) => (
          <Circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={2.5}
            fill={lineColor}
          />
        ))}

        {/* Highlight last point */}
        <Circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={3.5}
          fill={lineColor}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Sparkline;
