import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  Text,
  TextStyle,
  useColorScheme,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  Directions,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';

import type { Insets, Toast as ToastType } from '../core/types';
import { resolveValue, Toast as T, ToastPosition } from '../core/types';
import {
  colors,
  ConstructShadow,
  useKeyboard,
  useVisibilityChange,
} from '../utils';
import { toast as toasting } from '../headless';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const DEFAULT_TOAST_HEIGHT = 50;

type Props = {
  allowFontScaling?: boolean;
  toast: ToastType;
  updateHeight: (toastId: string, height: number) => void;
  offset: number;
  endPause: () => void;
  startPause: () => void;
  customRenderer?: (toast: ToastType) => React.ReactNode;
  overrideDarkMode?: boolean;
  onToastShow?: (toast: T) => void;
  onToastHide?: (toast: T) => void;
  onToastPress?: (toast: T) => void;
  insets: Insets;
  defaultStyle?: {
    pressable?: ViewStyle;
    view?: ViewStyle;
    text?: TextStyle;
    indicator?: ViewStyle;
  };
};

export const Toast: FC<Props> = ({
  allowFontScaling,
  toast,
  updateHeight,
  offset,
  startPause,
  endPause,
  overrideDarkMode,
  onToastHide,
  onToastPress,
  onToastShow,
  insets,
  defaultStyle,
}) => {
  const { width, height } = useWindowDimensions();
  const { keyboardShown: keyboardVisible, keyboardHeight } = useKeyboard();

  useVisibilityChange(
    () => {
      onToastShow?.(toast);
    },
    () => {
      onToastHide?.(toast);
    },
    toast.visible
  );

  const isSystemDarkMode = useColorScheme() === 'dark';
  const isDarkMode =
    overrideDarkMode !== undefined ? overrideDarkMode : isSystemDarkMode;

  const [toastHeight, setToastHeight] = useState<number>(
    toast?.height ? toast.height : DEFAULT_TOAST_HEIGHT
  );
  const [toastWidth, setToastWidth] = useState<number>(
    toast?.width ? toast.width : width - 32 > 360 ? 360 : width - 32
  );

  const startingY = useMemo(
    () =>
      toast.position === ToastPosition.TOP
        ? -(toast.height || DEFAULT_TOAST_HEIGHT) - insets.top - 50
        : height - insets.bottom - Platform.select({ ios: 0, default: 32 }),
    [height, toast.position, insets.bottom, insets.top, toast.height]
  );

  const opacity = useSharedValue(0);
  const position = useSharedValue(startingY);
  const offsetY = useSharedValue(startingY);

  const onPress = () => onToastPress?.(toast);
  const dismiss = useCallback((id: string) => {
    toasting.dismiss(id);
  }, []);

  const setPosition = useCallback(() => {
    //control the position of the toast when rendering
    //based on offset, visibility, keyboard, and toast height
    if (toast.position === ToastPosition.TOP) {
      offsetY.value = withTiming(toast.visible ? offset : startingY, {
        duration: toast?.animationConfig?.animationDuration ?? 300,
      });
      position.value = withTiming(toast.visible ? offset : startingY, {
        duration: toast?.animationConfig?.animationDuration ?? 300,
      });
    } else {
      let kbHeight = keyboardVisible ? keyboardHeight : 0;
      const val = toast.visible
        ? startingY -
          toastHeight -
          offset -
          kbHeight -
          insets.bottom -
          24
        : startingY;

      offsetY.value = withSpring(val, {
        stiffness: toast?.animationConfig?.animationStiffness ?? 80,
      });

      position.value = withSpring(val, {
        stiffness: toast?.animationConfig?.animationStiffness ?? 80,
      });
    }
  }, [
    offset,
    toast.visible,
    keyboardVisible,
    keyboardHeight,
    toastHeight,
    position,
    startingY,
    toast.position,
    offsetY,
    insets,
    toast.animationConfig,
  ]);

  const composedGesture = useMemo(() => {
    const panGesture = Gesture.Pan()
      .onUpdate((e) => {
        offsetY.value = e.translationY / 4 + position.value;
      })
      .onEnd(() => {
        runOnJS(setPosition)();
      });

    const flingGesture = Gesture.Fling()
      .direction(
        toast.position === ToastPosition.TOP ? Directions.UP : Directions.DOWN
      )
      .onEnd(() => {
        offsetY.value = withTiming(startingY, {
          duration: toast?.animationConfig?.flingPositionReturnDuration ?? 40,
        });
        runOnJS(dismiss)(toast.id);
      });

    return toast.isSwipeable
      ? Gesture.Simultaneous(flingGesture, panGesture)
      : panGesture;
  }, [
    offsetY,
    startingY,
    position,
    setPosition,
    toast.position,
    toast.id,
    dismiss,
    toast.isSwipeable,
    toast.animationConfig,
  ]);

  useEffect(() => {
    //set the toast height if it updates while rendered
    setToastHeight(toast?.height ? toast.height : DEFAULT_TOAST_HEIGHT);
  }, [toast.height]);

  useEffect(() => {
    //set the toast width if it updates while rendered
    setToastWidth(
      toast?.width ? toast.width : width - 32 > 360 ? 360 : width - 32
    );
  }, [toast.width, width]);

  useEffect(() => {
    //Control visibility of toast when rendering
    opacity.value = withTiming(toast.visible ? 1 : 0, {
      duration: toast?.animationConfig?.animationDuration ?? 300,
    });
  }, [toast.visible, opacity, toast.animationConfig]);

  useEffect(() => {
    setPosition();
  }, [
    offset,
    toast.visible,
    keyboardVisible,
    keyboardHeight,
    toastHeight,
    setPosition,
  ]);

  const style = useAnimatedStyle(() => {
    //Control opacity and translation of toast
    return {
      opacity: opacity.value,
      transform: [
        {
          translateY: offsetY.value,
        },
      ],
    };
  });

  return (
    <GestureDetector key={toast.id} gesture={composedGesture}>
      <AnimatedPressable
        onPressIn={startPause}
        onPressOut={() => {
          endPause();
        }}
        onPress={onPress}
        style={[
          {
            backgroundColor: !toast.customToast
              ? isDarkMode
                ? colors.backgroundDark
                : colors.backgroundLight
              : undefined,
            borderRadius: 8,
            position: 'absolute',
            left: (width - toastWidth) / 2,
            zIndex: toast.visible ? 9999 : undefined,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
          !toast.disableShadow && ConstructShadow('#181821', 0.15, false),
          defaultStyle?.pressable,
          toast.styles?.pressable,
        ]}
      >
        {toast.customToast ? (
          <View
            onLayout={(event) =>
              updateHeight(toast.id, event.nativeEvent.layout.height)
            }
            key={toast.id}
          >
            {toast.customToast({
              ...toast,
              height: toastHeight,
              width: toastWidth,
            })}
          </View>
        ) : (
          <View
            onLayout={(event) =>
              updateHeight(toast.id, event.nativeEvent.layout.height)
            }
            style={[
              {
                minHeight: toastHeight,
                width: toastWidth,
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 16,
              },
              defaultStyle?.view,
              toast.styles?.view,
            ]}
            key={toast.id}
          >
            {(toast.type === 'error' || toast.type === 'success') && (
              <View
                style={[
                  {
                    backgroundColor:
                      toast.type === 'error'
                        ? colors.error
                        : toast.type === 'success'
                        ? colors.success
                        : isDarkMode
                        ? colors.backgroundDark
                        : colors.backgroundLight,
                    width: 3,
                    height: '100%',
                    borderRadius: 12,
                    marginRight: 12,
                  },
                  defaultStyle?.indicator,
                  toast?.styles?.indicator,
                ]}
              />
            )}
            {typeof toast.icon === 'string' ? (
              <Text allowFontScaling={allowFontScaling}>{toast.icon}</Text>
            ) : (
              toast.icon
            )}
            <Text
              allowFontScaling={allowFontScaling}
              style={[
                {
                  color: isDarkMode ? colors.textLight : colors.textDark,
                  padding: 4,
                  flex: 1,
                },
                defaultStyle?.text,
                toast?.styles?.text,
              ]}
            >
              {resolveValue(toast.message, toast)}
            </Text>
          </View>
        )}
      </AnimatedPressable>
    </GestureDetector>
  );
};
