# Snap & Go - React Native Setup Guide

## 🎉 Project Setup Complete!

Your React Native project has been successfully set up with the following technologies:

- ✅ **Expo Router** (with tabs layout)
- ✅ **React Query** (@tanstack/react-query)
- ✅ **NativeWind** (TailwindCSS for React Native)
- ✅ **Custom Theme System** (colors.ts & fonts.ts)
- ✅ **Sora Font** (Google Font for body text)
- ✅ **Clash Display Font** (Local font for headers)

## 📁 Project Structure

```
monzi/
├── app/                          # Expo Router pages
│   ├── (tabs)/                   # Tab-based navigation
│   ├── _layout.tsx               # Root layout with providers
│   └── ...
├── components/                   # Reusable components
│   └── ThemeDemo.tsx             # Demo component
├── constants/                    # Theme constants
│   ├── colors.ts                 # Color palette & themes
│   └── fonts.ts                  # Typography system
├── providers/                    # Context providers
│   ├── QueryProvider.tsx         # React Query setup
│   └── ThemeProvider.tsx         # Custom theme provider
├── assets/                       # Static assets
│   └── fonts/                    # Font files
│       ├── ClashDisplay-Bold.otf
│       ├── ClashDisplay-Medium.otf
│       └── ... (other Clash Display variants)
├── babel.config.js               # Babel configuration
├── tailwind.config.js            # TailwindCSS configuration
├── global.css                    # NativeWind styles
└── package.json
```

## 🎨 Theme System

### Colors

Your color system is based on:
- **Primary Color**: `#E8B91F` (your specified golden color)
- **Gray Scale**: 25 → 900 (comprehensive scale)
- **Semantic Colors**: Success, Error, Warning, Info
- **Light & Dark Themes**: Automatically handled

#### Usage Examples:

```tsx
import { useTheme } from '@/providers/ThemeProvider';

function MyComponent() {
  const { colors, isDark } = useTheme();
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello World</Text>
    </View>
  );
}
```

### Fonts

- **Body Text**: Sora (Google Font)
- **Headers**: Clash Display (Local Font)

#### Typography Usage:

```tsx
import { typography } from '@/constants/fonts';

function MyComponent() {
  return (
    <>
      <Text style={typography.heading.h1}>Header (Clash Display)</Text>
      <Text style={typography.body.medium}>Body text (Sora)</Text>
    </>
  );
}
```

## 🎨 TailwindCSS Usage

### Custom Classes Available:

#### Colors:
```tsx
<View className="bg-primary-500">
<Text className="text-gray-900 dark:text-gray-100">
```

#### Fonts:
```tsx
<Text className="font-clash-bold text-2xl">Header</Text>
<Text className="font-sora-medium text-base">Body</Text>
```

#### Responsive Design:
```tsx
<View className="bg-white dark:bg-gray-900">
<Text className="text-gray-900 dark:text-white">
```

## 🚀 Quick Start

### 1. Add Clash Display Fonts
Place your Clash Display font files in `assets/fonts/`:
- `ClashDisplay-Extralight.otf`
- `ClashDisplay-Light.otf`
- `ClashDisplay-Regular.otf`
- `ClashDisplay-Medium.otf`
- `ClashDisplay-Semibold.otf`
- `ClashDisplay-Bold.otf`

### 2. Install Dependencies
```bash
yarn install
```

### 3. Start Development
```bash
yarn start
```

### 4. Test the Theme System
Import and use the `ThemeDemo` component to see all features:

```tsx
import ThemeDemo from '@/components/ThemeDemo';

export default function TabOneScreen() {
  return <ThemeDemo />;
}
```

## 🛠 Development Workflow

### Using React Query
```tsx
import { useQuery, useMutation } from '@tanstack/react-query';

function DataComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
  });

  const mutation = useMutation({
    mutationFn: updateData,
    onSuccess: () => {
      // Handle success
    },
  });

  // ... component logic
}
```

### Theme Switching
```tsx
import { useTheme } from '@/providers/ThemeProvider';

function SettingsScreen() {
  const { theme, setTheme } = useTheme();
  
  return (
    <Button onPress={() => setTheme('dark')}>
      Switch to Dark Mode
    </Button>
  );
}
```

### Custom Components with Theme
```tsx
import { useTheme } from '@/providers/ThemeProvider';
import { typography } from '@/constants/fonts';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

function CustomButton({ title, onPress, variant = 'primary' }: ButtonProps) {
  const { colors } = useTheme();
  
  const backgroundColor = variant === 'primary' ? colors.primary : colors.surface;
  const textColor = variant === 'primary' ? colors.white : colors.text;
  
  return (
    <TouchableOpacity
      style={{
        backgroundColor,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
      }}
      onPress={onPress}
    >
      <Text style={[typography.button.medium, { color: textColor }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
```

## 📱 Testing

Run on different platforms:
```bash
# iOS Simulator
yarn ios

# Android Emulator  
yarn android

# Web Browser
yarn web
```

## 🔧 Configuration Files

### TailwindCSS Config
- Custom colors matching your theme
- Custom font families
- Mobile-optimized spacing and sizing

### Babel Config
- NativeWind support
- Expo Router integration

### TypeScript Support
- Full type safety for theme system
- IntelliSense for colors and typography

## 📝 Next Steps

1. **Add your fonts**: Place Clash Display fonts in `assets/fonts/`
2. **Customize theme**: Modify `constants/colors.ts` and `constants/fonts.ts`
3. **Build your screens**: Use the tab layout in `app/(tabs)/`
4. **Add components**: Create reusable components in `components/`
5. **Implement features**: Use React Query for data fetching

## 🎯 Ready for PRD Implementation

Your project is now ready for implementing the Product Requirements Document (PRD). The theme system, navigation, and styling infrastructure are all set up and ready to use!

---

**Happy coding! 🚀** 