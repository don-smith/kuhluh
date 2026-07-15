import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import type { Color } from '../../types.js'

import AddColor from './AddColor.js'

const ColorLoading = () => (
  <div>
    <h2>Loading duh kuhluh ...</h2>
    <div>
      <img src='/getting-color.gif' className='waiting' />
    </div>
  </div>
)

const ColorViewer = () => {
  const [hasRequested, setHasRequested] = useState(false)

  const { data: color, isFetching, refetch } = useQuery<Color>({
    queryKey: ['color'],
    queryFn: () => fetch('/color').then(r => r.json()),
    enabled: false,
    refetchOnWindowFocus: false
  })

  const handleGetColor = (e: React.MouseEvent) => {
    e.preventDefault()
    setHasRequested(true)
    refetch()
  }

  const specifier = color?.name ? 'uhnuhthuh' : 'uh'
  const linkText = isFetching ? '' : `Get ${specifier} kuhluh`

  return (
    <div className='color'>
      <p><a href='#' onClick={handleGetColor}>{linkText}</a></p>
      <AddColor />
      {isFetching ? <ColorLoading /> : (
        hasRequested && (
          <p>
            <div className='swatch' style={{ backgroundColor: color?.name }}>
              {color?.name}
            </div>
          </p>
        )
      )}
    </div>
  )
}

export default ColorViewer