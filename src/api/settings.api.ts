// src/api/settings.api.ts
import apiClient from "./client";

export interface NumberingSequence {
  id?: string;
  moduleName: string;
  prefix: string;
  currentNumber: number;
  paddingLength: number;
  isActive: boolean;
  includeYear: boolean;
  includeMonth: boolean;
  lastResetYear: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateNumberingSequenceDto {
  prefix?: string;
  currentNumber?: number;
  paddingLength?: number;
  isActive?: boolean;
  includeYear?: boolean;
  includeMonth?: boolean;
}

// Numbering Sequences API
export const fetchNumberingSequences = async (): Promise<NumberingSequence[]> => {
  try {
    const response = await apiClient.get('/admin/settings/numbering-sequences');
    return response.data?.data ?? response.data;
  } catch (error) {
    console.error('API Error fetching numbering sequences:', error);
    throw error;
  }
};

export const updateNumberingSequence = async (
  moduleName: string, 
  data: UpdateNumberingSequenceDto
): Promise<NumberingSequence> => {
  try {
    const response = await apiClient.patch(`/admin/settings/numbering-sequences/${moduleName}`, data);
    return response.data;
  } catch (error) {
    console.error(`API Error updating numbering sequence for ${moduleName}:`, error);
    throw error;
  }
};

export const resetNumberingSequence = async (
  moduleName: string, 
  newCurrentNumber: number = 0
): Promise<NumberingSequence> => {
  try {
    const response = await apiClient.post(`/admin/settings/numbering-sequences/${moduleName}/reset`, {
      currentNumber: newCurrentNumber
    });
    return response.data;
  } catch (error) {
    console.error(`API Error resetting numbering sequence for ${moduleName}:`, error);
    throw error;
  }
};

export const initializeDefaultSequences = async (): Promise<NumberingSequence[]> => {
  try {
    const response = await apiClient.post('/admin/settings/numbering-sequences/initialize');
    return response.data;
  } catch (error) {
    console.error('API Error initializing default sequences:', error);
    throw error;
  }
};

export const getNextNumber = async (moduleName: string): Promise<string> => {
  try {
    const response = await apiClient.get(`/admin/settings/numbering-sequences/${moduleName}/next`);
    return response.data.nextNumber;
  } catch (error) {
    console.error(`API Error getting next number for ${moduleName}:`, error);
    throw error;
  }
};

// Future settings endpoints can be added here
export const fetchSystemSettings = async () => {
  try {
    const response = await apiClient.get('/admin/settings/system');
    return response.data;
  } catch (error) {
    console.error('API Error fetching system settings:', error);
    throw error;
  }
};

export const updateSystemSettings = async (settings: any) => {
  try {
    const response = await apiClient.patch('/admin/settings/system', settings);
    return response.data;
  } catch (error) {
    console.error('API Error updating system settings:', error);
    throw error;
  }
};