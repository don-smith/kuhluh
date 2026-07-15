import type { Color } from '../types.js'

const WAIT_TIME = 2000

const colors: Color[] = [
  { id: 1, name: 'DarkKhaki' },
  { id: 2, name: 'DarkSalmon' },
  { id: 3, name: 'DarkSlateGray' },
  { id: 4, name: 'DarkOrchid' },
  { id: 5, name: 'DarkCyan' },
  { id: 6, name: 'FireBrick' },
  { id: 7, name: 'Goldenrod' }
]

function getRandom(max: number): number {
  return Math.floor(Math.random() * max)
}

export function getColors(): Color[] {
  return colors
}

export function getColor(): Promise<Color> {
  const index = getRandom(colors.length)
  return new Promise((resolve) => {
    setTimeout(() => resolve(colors[index]), WAIT_TIME)
  })
}

export function addColor(name: string): Promise<void> {
  const newColor: Color = { id: colors.length + 1, name }
  return new Promise((resolve) => {
    setTimeout(() => {
      colors.push(newColor)
      resolve()
    }, WAIT_TIME)
  })
}