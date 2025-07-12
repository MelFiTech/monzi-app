import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { typography } from '@/constants/fonts';
import { ProfileCard } from './ProfileCard';
import { 
  User, 
  CreditCard, 
  Bell, 
  Shield, 
  HelpCircle, 
  LogOut,
  Edit,
  Wallet,
  History,
  Settings
} from 'lucide-react-native';

interface ProfileMenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showArrow?: boolean;
  danger?: boolean;
}

function ProfileMenuItem({ icon, title, subtitle, onPress, showArrow = true, danger = false }: ProfileMenuItemProps) {
  const { colors } = useTheme();
  
  return (
    <TouchableOpacity 
      style={[styles.menuItem, { borderBottomColor: colors.border }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: danger ? colors.error + '20' : colors.surface }]}>
          {icon}
        </View>
        <View style={styles.menuItemText}>
          <Text style={[styles.menuItemTitle, typography.label.medium, { color: danger ? colors.error : colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.menuItemSubtitle, typography.caption.medium, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {showArrow && (
        <View style={styles.menuItemRight}>
          <Text style={[styles.arrow, { color: colors.textTertiary }]}>→</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function ProfileScreen() {
  const { colors } = useTheme();
  const { user, logout } = useAuth();

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing feature coming soon!');
  };

  const handleWallet = () => {
    Alert.alert('Wallet', 'Wallet management feature coming soon!');
  };

  const handleTransactionHistory = () => {
    Alert.alert('Transaction History', 'Transaction history feature coming soon!');
  };

  const handlePaymentMethods = () => {
    Alert.alert('Payment Methods', 'Payment methods feature coming soon!');
  };

  const handleNotifications = () => {
    Alert.alert('Notifications', 'Notification settings feature coming soon!');
  };

  const handleSecurity = () => {
    Alert.alert('Security', 'Security settings feature coming soon!');
  };

  const handleHelp = () => {
    Alert.alert('Help & Support', 'Help center feature coming soon!');
  };

  const handleSettings = () => {
    Alert.alert('Settings', 'General settings feature coming soon!');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: () => logout() 
        },
      ]
    );
  };

  const userName = user?.email?.split('@')[0].replace(/\b\w/g, l => l.toUpperCase()) || 'User';
  const userEmail = user?.email || 'user@example.com';

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, typography.heading.h2, { color: colors.text }]}>
          Profile
        </Text>
      </View>

      {/* Profile Card */}
      <View style={styles.profileSection}>
        <ProfileCard
          name={userName}
          email={userEmail}
          subtitle="Tap to edit profile"
          onPress={handleEditProfile}
          showArrow={true}
        />
      </View>

      {/* Wallet Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, typography.heading.h4, { color: colors.text }]}>
          Wallet & Payments
        </Text>
        
        <ProfileMenuItem
          icon={<Wallet size={20} color={colors.primary} strokeWidth={2} />}
          title="My Wallet"
          subtitle="Manage your balance and funds"
          onPress={handleWallet}
        />
        
        <ProfileMenuItem
          icon={<History size={20} color={colors.primary} strokeWidth={2} />}
          title="Transaction History"
          subtitle="View all your transactions"
          onPress={handleTransactionHistory}
        />
        
        <ProfileMenuItem
          icon={<CreditCard size={20} color={colors.primary} strokeWidth={2} />}
          title="Payment Methods"
          subtitle="Manage cards and bank accounts"
          onPress={handlePaymentMethods}
        />
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, typography.heading.h4, { color: colors.text }]}>
          Account
        </Text>
        
        <ProfileMenuItem
          icon={<User size={20} color={colors.textSecondary} strokeWidth={2} />}
          title="Edit Profile"
          subtitle="Update your personal information"
          onPress={handleEditProfile}
        />
        
        <ProfileMenuItem
          icon={<Bell size={20} color={colors.textSecondary} strokeWidth={2} />}
          title="Notifications"
          subtitle="Manage notification preferences"
          onPress={handleNotifications}
        />
        
        <ProfileMenuItem
          icon={<Shield size={20} color={colors.textSecondary} strokeWidth={2} />}
          title="Security"
          subtitle="Password and security settings"
          onPress={handleSecurity}
        />
        
        <ProfileMenuItem
          icon={<Settings size={20} color={colors.textSecondary} strokeWidth={2} />}
          title="Settings"
          subtitle="App preferences and settings"
          onPress={handleSettings}
        />
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, typography.heading.h4, { color: colors.text }]}>
          Support
        </Text>
        
        <ProfileMenuItem
          icon={<HelpCircle size={20} color={colors.textSecondary} strokeWidth={2} />}
          title="Help & Support"
          subtitle="Get help and contact support"
          onPress={handleHelp}
        />
      </View>

      {/* Logout Section */}
      <View style={styles.section}>
        <ProfileMenuItem
          icon={<LogOut size={20} color={colors.error} strokeWidth={2} />}
          title="Logout"
          onPress={handleLogout}
          showArrow={false}
          danger={true}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, typography.caption.medium, { color: colors.textTertiary }]}>
          Snap & Go v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  profileSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
  },
  menuItemRight: {
    marginLeft: 12,
  },
  arrow: {
    fontSize: 16,
    fontWeight: '300',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
  },
});

export default ProfileScreen;