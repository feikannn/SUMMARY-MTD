import { useCallback } from "react";
import { useFocusEffect } from "expo-router";

// Refetch react-query data whenever the screen regains focus (e.g. after a form save).
export function useRefetchOnFocus(refetch: () => void) {
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );
}
