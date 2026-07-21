// src/stores/settings.store.ts
import { defineStore } from 'pinia';
import {
  fetchNumberingSequences,
  updateNumberingSequence,
  resetNumberingSequence,
  initializeDefaultSequences,
  getNextNumber,
  fetchSystemSettings,
  updateSystemSettings,
  type NumberingSequence,
  type UpdateNumberingSequenceDto
} from '@/api/settings.api';
import { NumberingModuleLabels, NumberingModule } from '@/types/generated/enums/numbering-module';

interface SettingsState {
  numberingSequences: NumberingSequence[];
  systemSettings: any;
  loading: boolean;
  saving: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    numberingSequences: [],
    systemSettings: {},
    loading: false,
    saving: false,
    error: null,
    lastUpdated: null
  }),

  getters: {
    getSequenceByModule: (state) => (moduleName: NumberingModule): NumberingSequence | undefined => {
      return state.numberingSequences.find(seq => seq.moduleName === moduleName);
    },

    getActiveSequences: (state): NumberingSequence[] => {
      return state.numberingSequences.filter(seq => seq.isActive);
    },

    getInactiveSequences: (state): NumberingSequence[] => {
      return state.numberingSequences.filter(seq => !seq.isActive);
    },

    getCurrentNumber: (state) => (moduleName: NumberingModule): string => {
      const sequence = state.numberingSequences.find(seq => seq.moduleName === moduleName);
      if (!sequence || !sequence.isActive) return 'Not configured';

      const paddedNumber = sequence.currentNumber
        .toString()
        .padStart(sequence.paddingLength, '0');

      if (sequence.includeYear) {
        const year = new Date().getFullYear();
        if (sequence.includeMonth) {
          const month = String(new Date().getMonth() + 1).padStart(2, '0');
          return `${sequence.prefix}${year}-${month}-${paddedNumber}`;
        }
        return `${sequence.prefix}${year}-${paddedNumber}`;
      }
      return `${sequence.prefix}${paddedNumber}`;
    },

    getNextNumberPreview: (state) => (moduleName: NumberingModule): string => {
      const sequence = state.numberingSequences.find(seq => seq.moduleName === moduleName);
      if (!sequence || !sequence.isActive) return 'Disabled';

      const nextNumber = sequence.currentNumber + 1;
      const paddedNumber = nextNumber
        .toString()
        .padStart(sequence.paddingLength, '0');

      if (sequence.includeYear) {
        const year = new Date().getFullYear();
        if (sequence.includeMonth) {
          const month = String(new Date().getMonth() + 1).padStart(2, '0');
          return `${sequence.prefix}${year}-${month}-${paddedNumber}`;
        }
        return `${sequence.prefix}${year}-${paddedNumber}`;
      }
      return `${sequence.prefix}${paddedNumber}`;
    },

    getModuleDisplayName: () => (moduleName: NumberingModule): string => {
      return NumberingModuleLabels[moduleName] || moduleName;
    },

    getAllModules: (): NumberingModule[] => {
      return Object.values(NumberingModule);
    },

    isSequenceConfigured: (state) => (moduleName: NumberingModule): boolean => {
      const sequence = state.numberingSequences.find(seq => seq.moduleName === moduleName);
      return !!sequence;
    }
  },

  actions: {
    async fetchNumberingSequences() {
      try {
        this.loading = true;
        this.error = null;
        
        const sequences = await fetchNumberingSequences();
        this.numberingSequences = sequences;
        this.lastUpdated = new Date();
        
        return sequences;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to fetch numbering sequences';
        console.error('Error fetching numbering sequences:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateNumberingSequence(moduleName: NumberingModule, data: UpdateNumberingSequenceDto) {
      try {
        this.saving = true;
        this.error = null;

        const updatedSequence = await updateNumberingSequence(moduleName, data);
        
        // Update local state
        const index = this.numberingSequences.findIndex(seq => seq.moduleName === moduleName);
        if (index !== -1) {
          this.numberingSequences[index] = updatedSequence;
        } else {
          this.numberingSequences.push(updatedSequence);
        }
        
        this.lastUpdated = new Date();
        return updatedSequence;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to update numbering sequence';
        console.error(`Error updating numbering sequence for ${moduleName}:`, error);
        throw error;
      } finally {
        this.saving = false;
      }
    },

    async resetNumberingSequence(moduleName: NumberingModule, newCurrentNumber: number = 0) {
      try {
        this.saving = true;
        this.error = null;

        const resetSequence = await resetNumberingSequence(moduleName, newCurrentNumber);
        
        // Update local state
        const index = this.numberingSequences.findIndex(seq => seq.moduleName === moduleName);
        if (index !== -1) {
          this.numberingSequences[index] = resetSequence;
        }
        
        this.lastUpdated = new Date();
        return resetSequence;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to reset numbering sequence';
        console.error(`Error resetting numbering sequence for ${moduleName}:`, error);
        throw error;
      } finally {
        this.saving = false;
      }
    },

    async initializeDefaultSequences() {
      try {
        this.loading = true;
        this.error = null;

        const sequences = await initializeDefaultSequences();
        this.numberingSequences = sequences;
        this.lastUpdated = new Date();
        
        return sequences;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to initialize default sequences';
        console.error('Error initializing default sequences:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async getNextNumber(moduleName: NumberingModule): Promise<string> {
      try {
        const nextNumber = await getNextNumber(moduleName);
        
        // Update local state to reflect the increment
        const sequence = this.numberingSequences.find(seq => seq.moduleName === moduleName);
        if (sequence) {
          sequence.currentNumber += 1;
        }
        
        return nextNumber;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to get next number';
        console.error(`Error getting next number for ${moduleName}:`, error);
        throw error;
      }
    },

    // System Settings Actions
    async fetchSystemSettings() {
      try {
        this.loading = true;
        this.error = null;
        
        const settings = await fetchSystemSettings();
        this.systemSettings = settings;
        
        return settings;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to fetch system settings';
        console.error('Error fetching system settings:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateSystemSettings(settings: any) {
      try {
        this.saving = true;
        this.error = null;

        const updatedSettings = await updateSystemSettings(settings);
        this.systemSettings = { ...this.systemSettings, ...updatedSettings };
        
        return updatedSettings;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to update system settings';
        console.error('Error updating system settings:', error);
        throw error;
      } finally {
        this.saving = false;
      }
    },

    // Utility Actions
    clearError() {
      this.error = null;
    },

    refreshSequences() {
      return this.fetchNumberingSequences();
    },

    // Bulk update multiple sequences
    async updateMultipleSequences(updates: Array<{ moduleName: NumberingModule; data: UpdateNumberingSequenceDto }>) {
      try {
        this.saving = true;
        this.error = null;

        const updatePromises = updates.map(({ moduleName, data }) => 
          this.updateNumberingSequence(moduleName, data)
        );

        const results = await Promise.all(updatePromises);
        return results;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to update multiple sequences';
        console.error('Error updating multiple sequences:', error);
        throw error;
      } finally {
        this.saving = false;
      }
    }
  }
});