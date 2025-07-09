import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { typography } from '@/constants/fonts';
import { ChatHeader, ChatBubble, ChatInput, TypingIndicator } from '@/components/chat';
import { Message, UserData, AuthFlowStep } from '@/services/ChatService';
import { 
  useAuthFlow, 
  useUserRegistrationMutation, 
  useTypingDelay,
  useChatUtils,
  useInputValidation 
} from '@/hooks';

export default function ChatAuthScreen() {
  const { colors } = useTheme();
  const { login } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useState<UserData>({
    email: '',
    otp: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [isTyping, setIsTyping] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const typingAnim = useRef(new Animated.Value(0)).current;

  // React Query hooks
  const { data: authFlow = [] } = useAuthFlow();
  const typingDelayMutation = useTypingDelay();
  const registrationMutation = useUserRegistrationMutation();
  const { createMessage, getSuccessMessage } = useChatUtils();
  const { validateInput, formatPhoneNumber, sanitizeInput } = useInputValidation();

  useEffect(() => {
    // Start with first question
    setTimeout(() => {
      addBotMessage(authFlow[0].question, true);
    }, 500);
  }, []);

  const addBotMessage = async (text: string, showInput = false) => {
    setIsTyping(true);
    
    // Simulate typing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(typingAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(typingAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    // Use React Query typing delay mutation
    await typingDelayMutation.mutateAsync();
    
    setIsTyping(false);
    typingAnim.stopAnimation();
    
    const newMessage = createMessage(
      text,
      true,
      showInput,
      authFlow[currentStep]?.inputType,
      authFlow[currentStep]?.placeholder
    );

    setMessages(prev => [...prev, newMessage]);
    setTimeout(() => scrollToBottom(), 100);
  };

  const addUserMessage = (text: string) => {
    const newMessage = createMessage(text, false);
    setMessages(prev => [...prev, newMessage]);
    setTimeout(() => scrollToBottom(), 100);
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;

    const currentField = authFlow[currentStep].field;
    const sanitizedInput = sanitizeInput(currentInput, authFlow[currentStep].inputType);
    
    // Validate input using React Query validation hook
    const validation = validateInput(sanitizedInput, currentField, userData);
    if (!validation.isValid) {
      addBotMessage(validation.errorMessage!, true);
      return;
    }

    // Add user message (display formatted version for phone)
    const displayInput = currentField === 'phone' ? formatPhoneNumber(sanitizedInput) : sanitizedInput;
    addUserMessage(displayInput);
    
    // Update user data
    const newUserData = {
      ...userData,
      [currentField]: sanitizedInput,
    };
    setUserData(newUserData);

    // Clear input
    setCurrentInput('');

    // Move to next step
    const nextStep = currentStep + 1;
    
    if (nextStep < authFlow.length) {
      setCurrentStep(nextStep);
      setTimeout(() => {
        addBotMessage(authFlow[nextStep].question, true);
      }, 1000);
    } else {
      // Registration complete
      setTimeout(async () => {
        addBotMessage(getSuccessMessage());
        
        // Register user using React Query mutation
        try {
          const registrationResult = await registrationMutation.mutateAsync(newUserData);
          
          if (registrationResult.success && registrationResult.user) {
            login(registrationResult.user);
            
            setTimeout(() => {
              router.replace('/(tabs)');
            }, 3000);
          } else {
            addBotMessage("There was an issue creating your account. Please try again later.");
          }
        } catch (error) {
          console.error('Registration failed:', error);
          addBotMessage("There was an issue creating your account. Please try again later.");
        }
      }, 1000);
    }
  };





  const showInput = messages.length > 0 && messages[messages.length - 1]?.showInput && !isTyping;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <ChatHeader isTyping={isTyping} />

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message, index) => (
          <ChatBubble 
            key={message.id}
            message={message} 
            index={index} 
            totalMessages={messages.length}
          />
        ))}
        {isTyping && <TypingIndicator typingAnimation={typingAnim} />}
      </ScrollView>

      {/* Input Area */}
      {showInput && (
        <ChatInput
          ref={inputRef}
          value={currentInput}
          onChangeText={setCurrentInput}
          onSend={handleSendMessage}
          placeholder={authFlow[currentStep]?.placeholder}
          inputType={authFlow[currentStep]?.inputType}
          maxLength={authFlow[currentStep]?.inputType === 'otp' ? 6 : undefined}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 100,
  },
}); 