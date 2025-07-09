# Camera Implementation Guide

## Overview
This guide documents the implementation of a fully functional camera screen with custom header and navigation setup for the Monzi app.

## Features Implemented

### ✅ 1. Custom Header Component
- **Location**: `components/layout/CameraHeader.tsx`
- **Features**:
  - User profile avatar (displays first letter of email)
  - App title "Snap & Go" 
  - Settings button with logout functionality
  - Back button support for navigation
  - Translucent overlay design
  - StatusBar configuration

### ✅ 2. Hidden Bottom Navigation
- **Location**: `app/(tabs)/_layout.tsx`
- **Implementation**:
  - `headerShown: false` - Removes default header
  - `tabBarStyle: { display: 'none' }` - Hides bottom tabs
  - Camera icon for tab representation

### ✅ 3. Expo Camera Integration
- **Package**: `expo-camera@^16.1.10`
- **Features Implemented**:
  - Camera permissions handling with user-friendly prompts
  - Real camera preview using `CameraView`
  - Photo capture with quality settings (0.8 quality)
  - Flash animation on capture
  - Flash modes: off, on, auto
  - Camera switching: front/back cameras
  - Grid overlay for composition
  - Focus frame with corner indicators

## Component Structure

```
app/(tabs)/index.tsx                 # Main camera screen
├── CameraHeader                     # Custom header component
├── CameraView                       # Expo camera component
│   ├── Flash Animation Overlay      # Visual feedback
│   ├── Grid Overlay                 # Rule of thirds guide
│   ├── Focus Frame                  # Target area indicators
│   ├── Top Controls                 # Flash toggle
│   ├── Instructions                 # User guidance
│   ├── Bottom Controls              # Capture, gallery, switch
│   └── Quick Actions                # Balance check, recent transactions
└── Permission Screens               # Camera access requests
```

## Key Functions

### Camera Operations
- `handleCapture()` - Takes photos with error handling
- `toggleFlash()` - Cycles through flash modes
- `toggleCamera()` - Switches between front/back cameras
- `showFlashAnimation()` - Visual capture feedback

### Permission Handling
- Automatic permission request on mount
- Graceful fallback screens for denied permissions
- User-friendly permission request interface

## UI/UX Features

### Visual Design
- Semi-transparent overlays for controls
- Professional camera interface
- Grid lines for composition
- Focus frame with corner indicators
- Smooth animations and transitions

### User Experience
- Intuitive control placement
- Clear visual feedback
- Error handling with alerts
- Progressive permission requests
- Quick action buttons for common tasks

## Technical Implementation

### State Management
```typescript
const [permission, requestPermission] = useCameraPermissions();
const [flashMode, setFlashMode] = useState<FlashMode>('off');
const [cameraType, setCameraType] = useState<CameraType>('back');
const [isCapturing, setIsCapturing] = useState(false);
```

### Camera Configuration
```typescript
<CameraView
  ref={cameraRef}
  style={styles.camera}
  facing={cameraType}
  flash={flashMode}
  mode="picture"
>
```

### Photo Capture
```typescript
const photo = await cameraRef.current.takePictureAsync({
  quality: 0.8,
  base64: false,
});
```

### Icon Usage
```typescript
// Dynamic flash icon based on mode
const getFlashIcon = () => {
  switch (flashMode) {
    case 'on': 
      return <Zap size={18} color={colors.white} strokeWidth={2} />;
    case 'auto': 
      return <RotateCcw size={18} color={colors.white} strokeWidth={2} />;
    default: 
      return <ZapOff size={18} color={colors.white} strokeWidth={2} />;
  }
};

// Header icons with proper theming
<Settings size={20} color={colors.white} strokeWidth={2} />
<ArrowLeft size={20} color={colors.white} strokeWidth={2} />
```

## File Structure
```
components/
├── layout/
│   ├── CameraHeader.tsx            # Custom header component
│   └── index.ts                    # Layout exports
├── camera/
│   ├── CameraButton.tsx            # Reusable camera buttons
│   └── index.ts                    # Camera exports
app/(tabs)/
├── _layout.tsx                     # Tab configuration
└── index.tsx                       # Camera screen implementation
```

## Next Steps / Future Enhancements

### Image Processing
- OCR integration for text extraction
- Account detail recognition
- Automatic data parsing

### Gallery Integration
- Photo gallery access
- Recent captures display
- Image editing capabilities

### Advanced Camera Features
- Zoom controls
- Manual focus
- Exposure adjustment
- HDR mode

### Data Management
- Local storage for captured images
- Cloud sync for processed data
- History tracking

## Development Notes

### Dependencies Added
```json
{
  "expo-camera": "^16.1.10",
  "lucide-react-native": "^0.525.0",
  "react-native-svg": "^15.12.0"
}
```

## Icon Implementation

### Professional Vector Icons
Replaced all emojis with professional Lucide icons for a modern, polished appearance:

#### Header Icons
- **Settings**: `Settings` icon for account settings
- **Back Button**: `ArrowLeft` icon for navigation
- **Profile Avatar**: `User` icon when no user email available

#### Camera Control Icons
- **Flash Off**: `ZapOff` icon (default state)
- **Flash On**: `Zap` icon (flash enabled)
- **Flash Auto**: `RotateCcw` icon (auto mode)
- **Camera Switch**: `SwitchCamera` icon (front/back toggle)
- **Gallery**: `Image` icon for photo gallery access

#### UI Enhancement Icons  
- **Instructions**: `Clipboard` icon with text guidance
- **Quick Balance**: `DollarSign` icon for balance check
- **Recent Transactions**: `TrendingUp` icon for transaction history
- **Default Camera**: `Camera` icon for fallback states

### Permission Requirements
- Camera access (automatically requested)
- Photo library access (for future gallery features)

### Performance Considerations
- Image quality set to 0.8 for balance between quality and size
- Animations optimized with `useNativeDriver: false` for layout animations
- Efficient state management to prevent unnecessary re-renders

## Testing Checklist

### Functional Testing
- [ ] Camera permissions work correctly
- [ ] Photo capture functions properly
- [ ] Flash modes toggle correctly
- [ ] Camera switching works
- [ ] Header navigation functions
- [ ] UI renders on different screen sizes

### Edge Cases
- [ ] Permission denied scenarios
- [ ] Camera unavailable situations
- [ ] Low storage warnings
- [ ] Network connectivity issues

## Troubleshooting

### Common Issues
1. **Camera not showing**: Check permissions in device settings
2. **Flash not working**: Verify device has flash capability
3. **Blurry photos**: Ensure proper focus before capture
4. **Performance issues**: Check for memory usage and optimize

### Debug Commands
```bash
# Check camera permissions
adb shell dumpsys package permissions | grep camera

# View app logs
npx expo logs

# Clear app data
npx expo r -c
``` 