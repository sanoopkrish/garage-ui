import { computed, type Ref } from 'vue'
import type { Validation } from '@vuelidate/core'

export function useValidation(v$: Ref<Validation>) {
  const fieldError = (field: string): string => {
    const f = v$.value[field]
    if (!f || !f.$error) return ''
    const err = f.$errors[0]
    return err?.$message as string || 'Invalid value'
  }

  const isInvalid = (field: string): boolean => {
    return !!v$.value[field]?.$error
  }

  const touchField = (field: string) => {
    v$.value[field]?.$touch()
  }

  const validate = async (): Promise<boolean> => {
    return await v$.value.$validate()
  }

  const reset = () => {
    v$.value.$reset()
  }

  const hasErrors = computed(() => v$.value.$error)

  return { fieldError, isInvalid, touchField, validate, reset, hasErrors }
}
