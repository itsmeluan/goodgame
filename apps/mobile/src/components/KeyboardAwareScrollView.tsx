import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import {
  findNodeHandle,
  Keyboard,
  Platform,
  ScrollView,
  type ScrollViewProps,
  TextInput,
} from "react-native";

type KeyboardAwareScrollContextValue = {
  scrollFieldIntoView: (input: TextInput | null, extraOffset?: number) => void;
};

const KeyboardAwareScrollContext = createContext<KeyboardAwareScrollContextValue | null>(null);

type KeyboardAwareScrollViewProps = ScrollViewProps & {
  keyboardOffset?: number;
};

export function KeyboardAwareScrollView({
  children,
  keyboardOffset = 110,
  ...props
}: KeyboardAwareScrollViewProps) {
  const scrollViewRef = useRef<ScrollView | null>(null);
  const pendingInputRef = useRef<TextInput | null>(null);
  const pendingOffsetRef = useRef(keyboardOffset);

  const performScroll = useCallback((input: TextInput | null, extraOffset: number) => {
    const reactNode = input ? findNodeHandle(input) : null;

    if (!reactNode) {
      return;
    }

    scrollViewRef.current
      ?.getScrollResponder?.()
      ?.scrollResponderScrollNativeHandleToKeyboard?.(reactNode, extraOffset, true);
  }, []);

  const scrollFieldIntoView = useCallback(
    (input: TextInput | null, extraOffset = keyboardOffset) => {
      pendingInputRef.current = input;
      pendingOffsetRef.current = extraOffset;

      requestAnimationFrame(() => {
        performScroll(input, extraOffset);
      });
    },
    [keyboardOffset, performScroll]
  );

  useEffect(() => {
    const resyncFocusedField = () => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          performScroll(pendingInputRef.current, pendingOffsetRef.current);
        }, 24);
      });
    };

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const frameEvent = Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";

    const showSubscription = Keyboard.addListener(showEvent, resyncFocusedField);
    const frameSubscription = Keyboard.addListener(frameEvent, resyncFocusedField);

    return () => {
      showSubscription.remove();
      frameSubscription.remove();
    };
  }, [performScroll]);

  const contextValue = useMemo(
    () => ({
      scrollFieldIntoView,
    }),
    [scrollFieldIntoView]
  );

  return (
    <KeyboardAwareScrollContext.Provider value={contextValue}>
      <ScrollView
        ref={scrollViewRef}
        keyboardDismissMode={props.keyboardDismissMode ?? "interactive"}
        automaticallyAdjustKeyboardInsets={props.automaticallyAdjustKeyboardInsets ?? false}
        automaticallyAdjustContentInsets={props.automaticallyAdjustContentInsets ?? false}
        contentInsetAdjustmentBehavior={props.contentInsetAdjustmentBehavior ?? "never"}
        bounces={props.bounces ?? false}
        alwaysBounceVertical={props.alwaysBounceVertical ?? false}
        overScrollMode={props.overScrollMode ?? "never"}
        {...props}
      >
        {children}
      </ScrollView>
    </KeyboardAwareScrollContext.Provider>
  );
}

export function useKeyboardAwareInputFocus(extraOffset?: number) {
  const context = useContext(KeyboardAwareScrollContext);
  const inputRef = useRef<TextInput | null>(null);

  const handleFocus = useCallback(() => {
    context?.scrollFieldIntoView(inputRef.current, extraOffset);
  }, [context, extraOffset]);

  return {
    inputRef,
    handleFocus,
  };
}
