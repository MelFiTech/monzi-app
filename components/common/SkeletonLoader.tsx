import React from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
// Temporarily commented out for Expo Go compatibility
// import { LinearGradient } from 'expo-linear-gradient';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  animated?: boolean;
}

interface SkeletonTextProps {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonLoaderProps) {
  const shimmerValue = new Animated.Value(0);

  React.useEffect(() => {
    const shimmer = () => {
      shimmerValue.setValue(0);
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }).start(() => shimmer());
    };
    shimmer();
  }, []);

  const shimmerInterpolation = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={[styles.skeleton, { width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            opacity: shimmerInterpolation,
          },
        ]}
      />
    </View>
  );
}

export function SkeletonText({ width = '100%', height = 16, style }: SkeletonTextProps) {
  return <SkeletonLoader width={width} height={height} borderRadius={8} style={style} />;
}

// Wallet-specific skeleton components
export function WalletBalanceSkeleton() {
  return (
    <View style={styles.walletSkeletonContainer}>
      {/* Balance label skeleton */}
      <View style={styles.balanceLabelContainer}>
        <SkeletonText width={100} height={14} />
        <View style={styles.statusIndicatorSkeleton} />
      </View>
      
      {/* Balance amount skeleton */}
      <View style={styles.balanceAmountContainer}>
        <SkeletonText width={140} height={32} style={styles.balanceAmountSkeleton} />
      </View>
      
      {/* Account info skeleton */}
      <View style={styles.accountPillSkeleton}>
        <SkeletonText width={180} height={14} />
      </View>
    </View>
  );
}

export function AccountInfoSkeleton() {
  return (
    <View style={styles.accountPillSkeleton}>
      <SkeletonText width={160} height={14} />
    </View>
  );
}

export function WalletHeaderSkeleton() {
  return <WalletBalanceSkeleton />;
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  walletSkeletonContainer: {
    alignItems: 'center',
    marginBottom: 70,
  },
  balanceLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicatorSkeleton: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginLeft: 8,
  },
  balanceAmountContainer: {
    marginBottom: 16,
  },
  balanceAmountSkeleton: {
    borderRadius: 12,
  },
  accountPillSkeleton: {
    backgroundColor: 'rgba(0, 0, 0, 0.29)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 34,
    justifyContent: 'center',
  },
});

export default SkeletonLoader; 