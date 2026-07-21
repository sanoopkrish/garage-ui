import { defineStore } from 'pinia'
import {
  fetchNotificationTemplates,
  fetchNotificationTemplate,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  seedDefaultTemplates,
  type NotificationTemplateDto,
  type CreateNotificationTemplateDto,
  type UpdateNotificationTemplateDto,
} from '@/api/notification-template.api'

interface NotificationTemplateState {
  templates: NotificationTemplateDto[]
  selectedTemplate: NotificationTemplateDto | null
  loading: boolean
  saving: boolean
  error: string | null
}

export const useNotificationTemplateStore = defineStore('notification-template', {
  state: (): NotificationTemplateState => ({
    templates: [],
    selectedTemplate: null,
    loading: false,
    saving: false,
    error: null,
  }),

  getters: {
    financeTemplates: (state) =>
      state.templates.filter((t) => t.category === 'finance'),

    systemTemplates: (state) =>
      state.templates.filter((t) => t.category === 'system'),

    activeTemplates: (state) => state.templates.filter((t) => t.isActive),

    getTemplateByCode: (state) => (code: string) =>
      state.templates.find((t) => t.code === code),
  },

  actions: {
    async fetchAll(category?: string) {
      try {
        this.loading = true
        this.error = null
        this.templates = await fetchNotificationTemplates(category)
        return this.templates
      } catch (error: any) {
        this.error = error?.response?.data?.message || 'Failed to fetch templates'
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchById(id: string) {
      try {
        this.loading = true
        this.error = null
        this.selectedTemplate = await fetchNotificationTemplate(id)
        return this.selectedTemplate
      } catch (error: any) {
        this.error = error?.response?.data?.message || 'Failed to fetch template'
        throw error
      } finally {
        this.loading = false
      }
    },

    async create(data: CreateNotificationTemplateDto) {
      try {
        this.saving = true
        this.error = null
        const template = await createNotificationTemplate(data)
        this.templates.push(template)
        return template
      } catch (error: any) {
        this.error = error?.response?.data?.message || 'Failed to create template'
        throw error
      } finally {
        this.saving = false
      }
    },

    async update(id: string, data: UpdateNotificationTemplateDto) {
      try {
        this.saving = true
        this.error = null
        const updated = await updateNotificationTemplate(id, data)
        const index = this.templates.findIndex((t) => t.id === id)
        if (index !== -1) this.templates[index] = updated
        if (this.selectedTemplate?.id === id) this.selectedTemplate = updated
        return updated
      } catch (error: any) {
        this.error = error?.response?.data?.message || 'Failed to update template'
        throw error
      } finally {
        this.saving = false
      }
    },

    async remove(id: string) {
      try {
        this.saving = true
        this.error = null
        await deleteNotificationTemplate(id)
        this.templates = this.templates.filter((t) => t.id !== id)
        if (this.selectedTemplate?.id === id) this.selectedTemplate = null
      } catch (error: any) {
        this.error = error?.response?.data?.message || 'Failed to delete template'
        throw error
      } finally {
        this.saving = false
      }
    },

    async seedDefaults() {
      try {
        this.saving = true
        this.error = null
        const result = await seedDefaultTemplates()
        await this.fetchAll()
        return result
      } catch (error: any) {
        this.error = error?.response?.data?.message || 'Failed to seed defaults'
        throw error
      } finally {
        this.saving = false
      }
    },

    clearError() {
      this.error = null
    },
  },
})
