import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText, G } from 'react-native-svg';
import { theme } from '../styles/theme';

interface RadarChartProps {
  scoreRecall: number;    // 0 to 100
  scoreRetention: number; // 0 to 100
  scoreTransfer: number;  // 0 to 100
  size?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  scoreRecall = 0,
  scoreRetention = 0,
  scoreTransfer = 0,
  size = 200,
}) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const r = (size / 2) * 0.75; // Max radius (leaving room for labels)

  // Trigonometric factors for 3 axes:
  // Axis 0 (Recall): 90 degrees (pointing straight up)
  // Axis 1 (Retention): 210 degrees (pointing bottom-left)
  // Axis 2 (Transfer): 330 degrees (pointing bottom-right)
  const angle0 = Math.PI / 2;         // 90 deg
  const angle1 = (7 * Math.PI) / 6;    // 210 deg
  const angle2 = (11 * Math.PI) / 6;   // 330 deg

  // Calculates (x, y) for a given value (0 to 100) and angle
  const getCoordinates = (value: number, angle: number) => {
    const valPercent = Math.max(5, Math.min(100, value)) / 100; // Cap between 5% and 100% so it's always visible
    const distance = r * valPercent;
    const x = centerX + distance * Math.cos(angle);
    const y = centerY - distance * Math.sin(angle); // Subtract because SVG coordinates are top-down
    return { x, y };
  };

  // Outer grid boundary vertices (100% value)
  const gridMax0 = getCoordinates(100, angle0);
  const gridMax1 = getCoordinates(100, angle1);
  const gridMax2 = getCoordinates(100, angle2);

  // Concentric grid vertices at 50% and 75% for depth
  const grid50_0 = getCoordinates(50, angle0);
  const grid50_1 = getCoordinates(50, angle1);
  const grid50_2 = getCoordinates(50, angle2);

  const grid75_0 = getCoordinates(75, angle0);
  const grid75_1 = getCoordinates(75, angle1);
  const grid75_2 = getCoordinates(75, angle2);

  // User's score vertices
  const p0 = getCoordinates(scoreRecall, angle0);
  const p1 = getCoordinates(scoreRetention, angle1);
  const p2 = getCoordinates(scoreTransfer, angle2);

  const pointsString = `${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`;
  const gridMaxString = `${gridMax0.x},${gridMax0.y} ${gridMax1.x},${gridMax1.y} ${gridMax2.x},${gridMax2.y}`;
  const grid75String = `${grid75_0.x},${grid75_0.y} ${grid75_1.x},${grid75_1.y} ${grid75_2.x},${grid75_2.y}`;
  const grid50String = `${grid50_0.x},${grid50_0.y} ${grid50_1.x},${grid50_1.y} ${grid50_2.x},${grid50_2.y}`;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G>
          {/* Concentric grid lines (triangles) */}
          <Polygon
            points={gridMaxString}
            fill="none"
            stroke={theme.colors.cardBorder}
            strokeWidth={1.5}
          />
          <Polygon
            points={grid75String}
            fill="none"
            stroke={theme.colors.cardBorder}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
          <Polygon
            points={grid50String}
            fill="none"
            stroke={theme.colors.cardBorder}
            strokeWidth={1}
            strokeDasharray="4,4"
          />

          {/* Core axis lines from center to outer bounds */}
          <Line
            x1={centerX}
            y1={centerY}
            x2={gridMax0.x}
            y2={gridMax0.y}
            stroke={theme.colors.cardBorder}
            strokeWidth={1.5}
          />
          <Line
            x1={centerX}
            y1={centerY}
            x2={gridMax1.x}
            y2={gridMax1.y}
            stroke={theme.colors.cardBorder}
            strokeWidth={1.5}
          />
          <Line
            x1={centerX}
            y1={centerY}
            x2={gridMax2.x}
            y2={gridMax2.y}
            stroke={theme.colors.cardBorder}
            strokeWidth={1.5}
          />

          {/* Actual score representation polygon */}
          <Polygon
            points={pointsString}
            fill={`${theme.colors.primary}33`} // 20% opacity primary
            stroke={theme.colors.primary}
            strokeWidth={2.5}
          />

          {/* Axis Labels */}
          <SvgText
            x={gridMax0.x}
            y={gridMax0.y - 12}
            fill={theme.colors.textPrimary}
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
          >
            RECALL ({Math.round(scoreRecall)}%)
          </SvgText>

          <SvgText
            x={gridMax1.x - 10}
            y={gridMax1.y + 15}
            fill={theme.colors.textSecondary}
            fontSize="10"
            fontWeight="600"
            textAnchor="end"
          >
            RETENTION ({Math.round(scoreRetention)}%)
          </SvgText>

          <SvgText
            x={gridMax2.x + 10}
            y={gridMax2.y + 15}
            fill={theme.colors.textSecondary}
            fontSize="10"
            fontWeight="600"
            textAnchor="start"
          >
            TRANSFER ({Math.round(scoreTransfer)}%)
          </SvgText>
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },
});
