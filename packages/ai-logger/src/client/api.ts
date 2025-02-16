import type { LogEntry } from '../types';

interface UploadLogsResponse {
  success: boolean;
  error?: string;
}

export async function uploadLogs(logs: LogEntry[]): Promise<void> {
  try {
    const response = await fetch('/_log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs }),
    });

    const data: UploadLogsResponse = await response.json();
    
    if (!data.success) {
      console.error('Failed to upload logs:', data.error);
    }
  } catch (error) {
    console.error('Failed to upload logs:', error);
  }
}