import { create } from 'zustand'

interface StoreState {
  isColorFormVisible: boolean
  toggleColorForm: () => void
}

const useStore = create<StoreState>((set) => ({
  isColorFormVisible: false,
  toggleColorForm: () => set((s) => ({ isColorFormVisible: !s.isColorFormVisible }))
}))

export default useStore