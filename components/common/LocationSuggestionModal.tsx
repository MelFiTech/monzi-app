import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { useGetCurrentLocation, usePreciseLocationSuggestions, useNearbyLocationSuggestions } from '@/hooks/useLocationService';
import { PaymentSuggestion } from '@/services/LocationService';
import Button from './Button';
import PaymentSuggestionCard from './PaymentSuggestionCard';

interface LocationSuggestionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuggestionSelected: (suggestion: PaymentSuggestion) => void;
  businessName?: string; // Optional business name to search for
  preFetchedData?: any; // Pre-fetched payment data for faster loading
}

export default function LocationSuggestionModal({
  visible,
  onClose,
  onSuggestionSelected,
  businessName,
  preFetchedData,
}: LocationSuggestionModalProps) {
  const { colors } = useTheme();
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Get current location
  const getLocationMutation = useGetCurrentLocation();

  // Get precise location suggestions (when business name is provided)
  const {
    data: preciseMatch,
    isLoading: isPreciseLoading,
    error: preciseError,
  } = usePreciseLocationSuggestions(
    currentLocation?.latitude || null,
    currentLocation?.longitude || null,
    businessName || 'Business' // Default business name if none provided
  );

  // Get nearby location suggestions (when no business name is provided)
  const {
    data: nearbyLocations,
    isLoading: isNearbyLoading,
    error: nearbyError,
  } = useNearbyLocationSuggestions(
    currentLocation?.latitude || null,
    currentLocation?.longitude || null,
    1000 // 1km radius
  );

  // Extract payment suggestions from locations
  const preciseSuggestions = preciseMatch?.paymentSuggestions || [];
  const nearbySuggestions = nearbyLocations?.flatMap(location => location.paymentSuggestions) || [];
  
  // Use pre-fetched data if available, otherwise use API data
  const hasPreFetchedData = preFetchedData && preFetchedData.paymentSuggestions && preFetchedData.paymentSuggestions.length > 0;
  const hasPreciseSuggestions = preciseSuggestions.length > 0;
  const suggestions = hasPreFetchedData ? preFetchedData.paymentSuggestions : (hasPreciseSuggestions ? preciseSuggestions : nearbySuggestions);
  
  // Only show loading when we don't have pre-fetched data AND we're waiting for API response
  const isSuggestionLoading = !hasPreFetchedData && (isPreciseLoading || isNearbyLoading);
  const suggestionError = !hasPreFetchedData && (preciseError || nearbyError);
  
  // Check if we have any suggestions available (either from pre-fetched or API)
  const hasSuggestions = suggestions.length > 0;

  useEffect(() => {
    if (visible) {
      checkMinimizedState();
    }
  }, [visible]);

  const checkMinimizedState = async () => {
    try {
      const minimized = await AsyncStorage.getItem('location_modal_minimized');
      if (minimized === 'true') {
        setIsMinimized(true);
      } else {
        setIsMinimized(false);
        captureLocation();
      }
    } catch (error) {
      console.log('Error checking minimized state:', error);
      captureLocation();
    }
  };

  useEffect(() => {
    if (visible && !isMinimized) {
      captureLocation();
    }
  }, [visible, isMinimized]);

  const captureLocation = async () => {
    // Skip location capture if we have pre-fetched data
    if (preFetchedData) {
      console.log('📍 [LocationSuggestionModal] Using pre-fetched data, skipping location capture');
      return;
    }
    
    try {
      const location = await getLocationMutation.mutateAsync();
      if (location) {
        setCurrentLocation(location);
        console.log('📍 [LocationSuggestionModal] Location captured:', location);
      }
    } catch (error) {
      console.log('⚠️ [LocationSuggestionModal] Location capture failed:', error);
      // Don't show error to user, just close modal
      onClose();
    }
  };

  const handleSuggestionPress = (suggestion: PaymentSuggestion) => {
    onSuggestionSelected(suggestion);
    onClose();
  };

  const handleClose = async () => {
    try {
      await AsyncStorage.setItem('location_modal_minimized', 'true');
      setIsMinimized(true);
      onClose();
    } catch (error) {
      console.log('Error saving minimized state:', error);
      onClose();
    }
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return '';
    if (distance < 1000) {
      return `${Math.round(distance)}m away`;
    }
    return `${(distance / 1000).toFixed(1)}km away`;
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.container}>
          {/* Fixed Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Suggestion</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Show suggestions immediately if available (from pre-fetched or API) */}
            {hasSuggestions && (
              <View style={styles.suggestionsContainer}>
                {suggestions.map((suggestion: PaymentSuggestion, index: number) => (
                  <PaymentSuggestionCard
                    key={`${suggestion.accountNumber}-${suggestion.bankName}-${index}`}
                    suggestion={suggestion}
                    onPress={handleSuggestionPress}
                  />
                ))}
              </View>
            )}

            {/* Show loading only when waiting for backend API response */}
            {!hasSuggestions && getLocationMutation.isPending && !preFetchedData && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFE66C" />
                <Text style={styles.loadingText}>Getting your location...</Text>
              </View>
            )}

            {!hasSuggestions && isSuggestionLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFE66C" />
                <Text style={styles.loadingText}>Finding payment details...</Text>
              </View>
            )}

            {!hasSuggestions && !isSuggestionLoading && (preciseMatch || (nearbyLocations && nearbyLocations.length > 0)) && (
              <View style={styles.noSuggestionContainer}>
                <Text style={styles.noSuggestionTitle}>Location Found</Text>
                <Text style={styles.noSuggestionText}>
                  {preciseMatch ? (
                    `We found "${preciseMatch.name}" at this location, but no payment details are available yet.`
                  ) : (
                    `We found ${nearbyLocations?.length || 0} nearby businesses, but no payment details are available yet.`
                  )}
                </Text>
                <Button
                  title="Go Back"
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onPress={handleClose}
                  style={styles.manualButton}
                />
              </View>
            )}

            {!hasSuggestions && !getLocationMutation.isPending && !isSuggestionLoading && (
              <View style={styles.noSuggestionContainer}>
                <Text style={styles.noSuggestionTitle}>No Payment Details Found</Text>
                <Text style={styles.noSuggestionText}>
                  We couldn't find payment details for this location.
                </Text>
                <Button
                  title="Go Back"
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onPress={handleClose}
                  style={styles.manualButton}
                />
              </View>
            )}

            {suggestionError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Unable to Load Suggestions</Text>
                <Text style={styles.errorText}>
                  There was an issue loading payment suggestions. You can continue with manual entry.
                </Text>
                <Button
                  title="Go Back"
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onPress={handleClose}
                  style={styles.manualButton}
                />
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.09)',
    backgroundColor: '#000000',
    zIndex: 10,
  },
  title: {
    fontSize: fontSizes.xl,
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: fontSizes.base,
    color: '#FFFFFF',
    fontFamily: fontFamilies.sora.medium,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  contentContainer: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  suggestionsContainer: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    minHeight: 200,
  },
  loadingText: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  noSuggestionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
    minHeight: 200,
  },
  noSuggestionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  noSuggestionText: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  manualButton: {
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
    minHeight: 200,
  },
  errorTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  errorText: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
}); 