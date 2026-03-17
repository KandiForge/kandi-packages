/**
 * useAgenticForm — Primary hook for consuming agentic form state
 *
 * Must be used within a <FormProvider>.
 */

import { useFormContext, type FormContextValue } from './FormProvider.js';

export type UseAgenticFormReturn = FormContextValue;

/** Primary hook for agentic form interaction */
export function useAgenticForm(): UseAgenticFormReturn {
  return useFormContext();
}
