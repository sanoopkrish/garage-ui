import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  getCreditNotes,
  getCreditNote as getCreditNoteApi,
  createCreditNote as createCreditNoteApi,
  updateCreditNote as updateCreditNoteApi,
  issueCreditNote as issueCreditNoteApi,
  allocateCreditNote as allocateCreditNoteApi,
  unallocateCreditNote as unallocateCreditNoteApi,
  voidCreditNote as voidCreditNoteApi,
  syncCreditNote as syncCreditNoteApi,
} from '@/api/credit-notes.api'
import type { CreditNote, CreateCreditNoteInput, UpdateCreditNoteInput } from '@/api/credit-notes.api'
import type { CreditNoteStatus } from '@/types/generated/enums/credit-note'

function messageOf(err: any, fallback: string): string {
  const message = err?.response?.data?.message
  return Array.isArray(message) ? message.join('; ') : (message ?? fallback)
}

export const useCreditNotesStore = defineStore('creditNotes', () => {
  const items = ref<CreditNote[]>([])
  const item = ref<CreditNote | null>(null)
  const total = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const currentPage = ref(1)
  const pageSize = ref(10)

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  async function fetchCreditNotes(params?: {
    search?: string
    status?: CreditNoteStatus
    customerId?: string
    invoiceId?: string
    page?: number
  }) {
    isLoading.value = true
    error.value = null
    try {
      const response = await getCreditNotes({ ...params, page: params?.page ?? currentPage.value, pageSize: pageSize.value })
      items.value = response.items
      total.value = response.total
      if (params?.page !== undefined) currentPage.value = params.page
    } catch (err) {
      error.value = messageOf(err, 'Failed to load credit notes')
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /** Replace the row in the list (if present) and the open item after any mutation */
  function apply(updated: CreditNote): CreditNote {
    const index = items.value.findIndex((c) => c.id === updated.id)
    if (index >= 0) items.value[index] = updated
    if (item.value?.id === updated.id) item.value = updated
    return updated
  }

  async function run<T>(fallback: string, fn: () => Promise<T>): Promise<T> {
    error.value = null
    try {
      return await fn()
    } catch (err) {
      error.value = messageOf(err, fallback)
      throw err
    }
  }

  const fetchCreditNote = (id: string) => run('Failed to load credit note', async () => (item.value = await getCreditNoteApi(id)))
  const createCreditNote = (payload: CreateCreditNoteInput) => run('Failed to create credit note', () => createCreditNoteApi(payload))
  const updateCreditNote = (id: string, payload: UpdateCreditNoteInput) => run('Failed to update credit note', async () => apply(await updateCreditNoteApi(id, payload)))
  const issueCreditNote = (id: string, autoAllocate = true) => run('Failed to issue credit note', async () => apply(await issueCreditNoteApi(id, autoAllocate)))
  const allocate = (id: string, invoiceId: string, amount?: number) => run('Failed to allocate credit', async () => apply(await allocateCreditNoteApi(id, invoiceId, amount)))
  const unallocate = (id: string, invoiceId: string) => run('Failed to remove allocation', async () => apply(await unallocateCreditNoteApi(id, invoiceId)))
  const voidCreditNote = (id: string) => run('Failed to void credit note', async () => apply(await voidCreditNoteApi(id)))
  const syncCreditNote = (id: string) => run('Xero push failed', async () => apply(await syncCreditNoteApi(id)))

  return {
    items, item, total, isLoading, error, currentPage, pageSize, totalPages,
    fetchCreditNotes, fetchCreditNote, createCreditNote, updateCreditNote, issueCreditNote,
    allocate, unallocate, voidCreditNote, syncCreditNote,
  }
})
