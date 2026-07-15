import { create } from 'zustand'

// Client-only UI state. Server state (color data, loading) is managed by TanStack Query.
const useStore = create((set) => ({
  isColorFormVisible: false,
  toggleColorForm: () => set((s) => ({ isColorFormVisible: !s.isColorFormVisible }))
}))

export default useStore