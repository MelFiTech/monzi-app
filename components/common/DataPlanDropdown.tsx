import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { fontFamilies } from '@/constants/fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DataPlan {
  bundle_id: string;
  amount: string;
  data_bundle: string;
  validity: string;
}

interface DataPlanDropdownProps {
  plans: DataPlan[];
  selectedPlan: DataPlan | null;
  onPlanSelect: (plan: DataPlan) => void;
  isOpen: boolean;
  onToggle: () => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

type FilterType = 'all' | 'daily' | 'weekly' | 'monthly';

export default function DataPlanDropdown({
  plans,
  selectedPlan,
  onPlanSelect,
  isOpen,
  onToggle,
  error,
  placeholder = 'Select a data plan',
  disabled = false,
}: DataPlanDropdownProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Filter plans based on active filter
  const getFilteredPlans = () => {
    let filtered = [...plans];
    
    switch (activeFilter) {
      case 'daily':
        filtered = plans.filter(plan => 
          plan.validity.toLowerCase().includes('day') && 
          !plan.validity.toLowerCase().includes('week') &&
          !plan.validity.toLowerCase().includes('month')
        );
        break;
      case 'weekly':
        filtered = plans.filter(plan => 
          plan.validity.toLowerCase().includes('week')
        );
        break;
      case 'monthly':
        filtered = plans.filter(plan => 
          plan.validity.toLowerCase().includes('month')
        );
        break;
      default:
        filtered = plans;
    }
    
    // Sort by price (cheapest first)
    return filtered.sort((a, b) => parseInt(a.amount) - parseInt(b.amount));
  };

  const filteredPlans = getFilteredPlans();

  const handleFilterPress = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  return (
    <View style={styles.container}>
      {/* Dropdown Input */}
      <TouchableOpacity
        style={[
          styles.dropdownInput, 
          error && styles.dropdownInputError,
          disabled && styles.dropdownInputDisabled
        ]}
        onPress={disabled ? undefined : onToggle}
        disabled={disabled}
      >
        <View style={styles.dropdownContent}>
          {selectedPlan ? (
            <View>
              <Text style={styles.selectedPlanName}>{selectedPlan.data_bundle}</Text>
              <Text style={styles.selectedPlanDetails}>
                {selectedPlan.validity} • ₦{selectedPlan.amount}
              </Text>
            </View>
          ) : (
            <Text style={[
              styles.dropdownPlaceholder,
              disabled && styles.dropdownPlaceholderDisabled
            ]}>{placeholder}</Text>
          )}
        </View>
        <FontAwesome
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={16}
          color={disabled ? "rgba(255, 255, 255, 0.3)" : "#FFFFFF"}
        />
      </TouchableOpacity>

      {/* Dropdown List */}
      {isOpen && (
        <View style={styles.dropdownList}>
          {/* Filter Pills */}
          <View style={styles.filterContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScrollContent}
            >
              {[
                { key: 'all', label: 'All' },
                { key: 'daily', label: 'Daily' },
                { key: 'weekly', label: 'Weekly' },
                { key: 'monthly', label: 'Monthly' },
              ].map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterPill,
                    activeFilter === filter.key && styles.filterPillActive,
                  ]}
                  onPress={() => handleFilterPress(filter.key as FilterType)}
                >
                  <Text style={[
                    styles.filterPillText,
                    activeFilter === filter.key && styles.filterPillTextActive,
                  ]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Plans List */}
          <ScrollView
            style={styles.plansScrollView}
            contentContainerStyle={styles.plansScrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {filteredPlans.length > 0 ? (
              filteredPlans.map((plan, idx) => {
                const isLast = idx === filteredPlans.length - 1;
                return (
                  <TouchableOpacity
                    key={plan.bundle_id}
                    style={[
                      styles.dropdownItem,
                      selectedPlan?.bundle_id === plan.bundle_id && styles.dropdownItemSelected,
                      isLast && styles.dropdownItemNoBorder,
                    ]}
                    onPress={() => onPlanSelect(plan)}
                  >
                    <View style={styles.dropdownItemContent}>
                      <Text style={[
                        styles.dropdownItemName,
                        { color: selectedPlan?.bundle_id === plan.bundle_id ? '#FFE66C' : '#FFFFFF' }
                      ]}>
                        {plan.data_bundle}
                      </Text>
                      <Text style={[
                        styles.dropdownItemDetails,
                        { color: selectedPlan?.bundle_id === plan.bundle_id ? 'rgba(255, 230, 108, 0.7)' : 'rgba(255, 255, 255, 0.6)' }
                      ]}>
                        {plan.validity} • ₦{plan.amount}
                      </Text>
                    </View>
                    {selectedPlan?.bundle_id === plan.bundle_id && (
                      <FontAwesome name="check" size={16} color="#FFE66C" />
                    )}
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.noPlansContainer}>
                <Text style={styles.noPlansText}>No plans available for this filter</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Error Text */}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  dropdownInput: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dropdownInputError: {
    borderColor: '#FF6B6B',
  },
  dropdownInputDisabled: {
    backgroundColor: 'rgba(10, 10, 10, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.6,
  },
  dropdownContent: {
    flex: 1,
  },
  selectedPlanName: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  selectedPlanDetails: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  dropdownPlaceholderDisabled: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  dropdownList: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: 300, // Reduced to account for button space
    zIndex: 1000,
    elevation: 5,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  filterScrollContent: {
    paddingRight: 16,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: 'rgba(255, 231, 108, 0.2)',
    borderWidth: 1,
    borderColor: '#FFE66C',
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: fontFamilies.sora.medium,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  filterPillTextActive: {
    color: '#FFE66C',
  },
  plansScrollView: {
    maxHeight: 230, // Reduced to ensure button doesn't cover content
  },
  plansScrollContent: {
    paddingBottom: 20, // Extra padding to ensure last item is fully visible
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dropdownItemNoBorder: {
    borderBottomWidth: 0,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(255, 231, 108, 0.1)',
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemName: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.semiBold,
    marginBottom: 2,
  },
  dropdownItemDetails: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
  },
  noPlansContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noPlansText: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontFamily: fontFamilies.sora.regular,
    marginTop: 4,
    marginLeft: 4,
  },
});
