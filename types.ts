export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'loading';
  message: string;
}

export interface ProcessStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}