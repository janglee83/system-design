import { create } from "zustand";

export interface Toast {
  id: number;
  message: string;
  tone: "info" | "warn" | "error";
}
interface ToastState {
  toasts: Toast[];
  push(message: string, tone?: Toast["tone"]): void;
  dismiss(id: number): void;
}
let next = 1;
export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push(message, tone = "info") {
    const id = next++;
    set({ toasts: [...get().toasts.slice(-2), { id, message, tone }] });
    setTimeout(() => get().dismiss(id), 4000);
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));
export const toast = (message: string, tone?: Toast["tone"]) => useToasts.getState().push(message, tone);
