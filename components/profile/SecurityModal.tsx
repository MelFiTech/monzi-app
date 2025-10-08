import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { BlurView } from 'expo-blur';

interface SecurityModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SecurityModal({ visible, onClose }: SecurityModalProps) {
  const { colors } = useTheme();
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleChangeTransactionPIN = () => {
    onClose();
    setTimeout(() => {
      try {
        router.push('/change-pin');
      } catch (error) {
        console.error('Error navigating to change-pin:', error);
        Alert.alert('Navigation Error', 'Unable to open PIN settings. Please try again.');
      }
    }, 300);
  };

  const handleChangePassword = () => {
    onClose();
    setTimeout(() => {
      try {
        router.push('/change-passcode');
      } catch (error) {
        console.error('Error navigating to change-passcode:', error);
        Alert.alert('Navigation Error', 'Unable to open passcode settings. Please try again.');
      }
    }, 300);
  };

  const handleDeleteAccount = () => {
    onClose();
    setTimeout(() => {
      try {
        router.push('/delete-account');
      } catch (error) {
        console.error('Error navigating to delete-account:', error);
        Alert.alert('Navigation Error', 'Unable to open account deletion. Please try again.');
      }
    }, 300);
  };

  const SecurityOption = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    isDestructive = false 
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress: () => void;
    isDestructive?: boolean;
  }) => {
    const handlePress = () => {
      try {
        onPress();
      } catch (error) {
        console.error('Error in SecurityOption press:', error);
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    };

    return (
      <TouchableOpacity 
        style={styles.optionContainer} 
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.optionContent}>
          <View style={[styles.iconContainer, isDestructive && styles.destructiveIcon]}>
            <Image 
              source={icon}
              style={[styles.iconImage, isDestructive && styles.destructiveIconImage]}
              resizeMode="contain"
              onError={(error) => {
                console.warn('Failed to load security icon:', error);
              }}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.optionTitle, isDestructive && styles.destructiveText]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.optionSubtitle}>{subtitle}</Text>
            )}
          </View>
          <View style={styles.chevronContainer}>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={styles.blurView}>
          <TouchableOpacity 
            style={styles.backdrop} 
            activeOpacity={1} 
            onPress={onClose}
          />
        </BlurView>

        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY }],
            }
          ]}
        >
          {/* Handle Bar */}
          <View style={styles.handleBar}>
            <View style={styles.handle} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <SecurityOption
              icon={require('../../assets/icons/security/pin.png')}
              title="Change Transaction PIN"
              subtitle="You use this PIN for transactions"
              onPress={handleChangeTransactionPIN}
            />

            <SecurityOption
              icon={require('../../assets/icons/security/lock.png')}
              title="Change Passcode"
              subtitle="You use this passcode to log in"
              onPress={handleChangePassword}
            />

            <SecurityOption
              icon={require('../../assets/icons/security/trash-icon.png')}
              title="Delete Account"
              onPress={handleDeleteAccount}
              isDestructive={true}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    maxHeight: '75%',
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 24,
    gap: 8,
  },
  optionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 22,
    overflow: 'hidden',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  destructiveIcon: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  iconImage: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  destructiveIconImage: {
    tintColor: '#FF3B30',
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.sora.medium,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  destructiveText: {
    color: '#FF3B30',
  },
  optionSubtitle: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  chevronContainer: {
    width: 24,
    alignItems: 'center',
  },
  chevron: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '300',
  },
});
