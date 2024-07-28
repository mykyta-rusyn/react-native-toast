import React, { FunctionComponent } from 'react';
import { TextStyle, View, ViewStyle } from 'react-native';

import { Toast as T, useToaster } from '../headless';
import { Toast } from './Toast';
import { Insets } from '../core/types';
import { useScreenReader } from '../core/utils';

type Props = {
  allowFontScaling?: boolean;
  overrideDarkMode?: boolean;
  insets: Insets;
  onToastShow?: (toast: T) => void;
  onToastHide?: (toast: T) => void;
  onToastPress?: (toast: T) => void;
  providerKey?: string;
  preventScreenReaderFromHiding?: boolean;
  defaultStyle?: {
    pressable?: ViewStyle;
    view?: ViewStyle;
    text?: TextStyle;
    indicator?: ViewStyle;
  };
};

export const Toasts: FunctionComponent<Props> = ({
  allowFontScaling,
  overrideDarkMode,
  insets,
  onToastHide,
  onToastPress,
  onToastShow,
  providerKey = 'DEFAULT',
  preventScreenReaderFromHiding,
  defaultStyle,
}) => {
  const { toasts, handlers } = useToaster({ providerKey });
  const { startPause, endPause } = handlers;
  const isScreenReaderEnabled = useScreenReader();

  if (isScreenReaderEnabled && !preventScreenReaderFromHiding) {
    return null;
  }

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + 16,
        left: insets.left,
        right: insets.right,
        bottom: insets.bottom + 16,
      }}
      pointerEvents={'box-none'}
    >
      {toasts.map((t) => (
        <Toast
          allowFontScaling={allowFontScaling}
          key={t.id}
          toast={t}
          startPause={startPause}
          endPause={endPause}
          updateHeight={handlers.updateHeight}
          offset={handlers.calculateOffset(t, {
            reverseOrder: true,
          })}
          overrideDarkMode={overrideDarkMode}
          onToastHide={onToastHide}
          onToastPress={onToastPress}
          onToastShow={onToastShow}
          insets={insets}
          defaultStyle={defaultStyle}
        />
      ))}
    </View>
  );
};
