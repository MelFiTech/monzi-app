        import React from 'react';
        import {
        StyleSheet,
        View,
        Text,
        SafeAreaView,
        Image,
        ImageBackground,
        TouchableOpacity,
        StatusBar,
        Linking,
        } from 'react-native';
        import { router } from 'expo-router';
        import { fontFamilies } from '@/constants/fonts';

        export default function AboutScreen() {
        const handleBack = () => {
            router.back();
        };

        const handlePrivacyPolicy = () => {
            // TODO: Open privacy policy URL
            console.log('Privacy Policy pressed');
        };

        const handleReviewApp = () => {
            // TODO: Open app store review
            console.log('Review the app pressed');
        };

        const handleSocialMediaPress = () => {
            // TODO: Open social media link
            console.log('Social media pressed');
        };

        return (
            <>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <ImageBackground
                source={require('@/assets/icons/profile/about/about-bg.png')}
                style={styles.container}
                resizeMode="cover"
            >
                <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Text style={styles.closeIcon}>✕</Text>
                    </TouchableOpacity>
                </View>

                {/* Main Content */}
                <View style={styles.content}>
                    {/* Logo Section */}
                    <View style={styles.logoContainer}>
                    <Image
                        source={require('@/assets/icons/profile/about/glow.png')}
                        style={styles.glow}
                    />
                    </View>

                    {/* Text Content */}
                    <View style={styles.textContent}>
                    <Text style={styles.mainTitle}>Built by Two,</Text>
                    <Text style={styles.mainTitle}>Made for Many.</Text>
                    
                    <Text style={styles.description}>
                        We hated typing account numbers, like, really hated it. So we built Monzi. Snap & send money in seconds. No typing, no typos, no long talk.
                    </Text>

                    <TouchableOpacity onPress={handleSocialMediaPress}>
                        <Text style={styles.socialHandle}>
                            <Text style={styles.followText}>Follow our journey </Text>
                            <Text style={styles.handleText}>@monzimoney</Text>
                        </Text>
                    </TouchableOpacity>
                    </View>
                </View>

                {/* Bottom Links */}
                <View style={styles.bottomLinks}>
                    <TouchableOpacity onPress={handlePrivacyPolicy}>
                        <Text style={styles.linkText}>Privacy Policy</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.divider} />
                    
                    <TouchableOpacity onPress={handleReviewApp}>
                        <Text style={styles.linkText}>Review the app</Text>
                    </TouchableOpacity>
                </View>
                </SafeAreaView>
            </ImageBackground>
            </>
        );
        }

        const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#000000',
        },
        safeArea: {
            flex: 1,
        },
        header: {
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 20,
        },
        backButton: {
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
        },
        closeIcon: {
            fontSize: 24,
            color: '#FFFFFF',
        },
        content: {
            flex: 1,
            alignItems: 'center',
            paddingHorizontal: 20,
        },
        logoContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 60,
            marginBottom: 80,
            position: 'relative',
        },
        glow: {
            width: 580,
            height: 580,
            position: 'absolute',
            marginTop: 250,
            marginBottom: 100,
        },
        textContent: {
            alignItems: 'center',
            paddingHorizontal: 20,
            marginTop: 280,
            
        },
        mainTitle: {
            fontSize: 32,
            fontFamily: fontFamilies.clashDisplay.semibold,
            color: '#FFFFFF',
            textAlign: 'center',
            fontWeight: '600',
            lineHeight: 38,
        },
        description: {
            fontSize: 14,
            fontFamily: fontFamilies.sora.light,
            color: 'rgba(255, 255, 255, 0.52)',
            textAlign: 'center',
            lineHeight: 24,
            marginTop: 8,
            marginBottom: 32,
        },
        socialHandle: {
            fontSize: 14,
            textAlign: 'center',
        },
        followText: {
            fontFamily: fontFamilies.sora.light,
            color: '#959595',
        },
        handleText: {
            fontFamily: fontFamilies.sora.bold,
            color: '#959595',
        },
        bottomLinks: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingBottom: 20,
        },
        linkText: {
            fontSize: 14,
            fontFamily: fontFamilies.sora.medium,
            color: '#A7A7A7',
            textAlign: 'center',
        },
        divider: {
            width: 1,
            height: 40,
            backgroundColor: 'rgba(255, 255, 255, 0.13)',
            marginHorizontal: 20,
        },
        }); 