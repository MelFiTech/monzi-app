import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies } from '@/constants/fonts';

interface RecipientDetailCardProps {
  name: string;
  accountNumber: string;
  bankName: string;
}

export default function RecipientDetailCard({ 
  name, 
  accountNumber, 
  bankName 
}: RecipientDetailCardProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Image 
          source={require('@/assets/icons/home/bank.png')}
          style={styles.bankImage}
        />
      </View>
      
      <View style={styles.detailsContainer}>
        <Text numberOfLines={1} style={styles.nameText}>
          {name || 'Resolving account name...'}
        </Text>
        <Text numberOfLines={1} style={styles.accountText}>
          {accountNumber} • {bankName}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 206,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 32,
    paddingLeft: 25,
  },
  iconContainer: {
    marginRight: 16,
  },
  bankImage: {
    width: 22,
    height: 22,
  },
  detailsContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  accountText: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.6)',
  },
}); 