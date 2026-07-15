import React, { useRef } from 'react'
import { useMutation } from '@tanstack/react-query'

import useStore from '../store'

const AddColor = () => {
  const inputRef = useRef(null)
  const { isColorFormVisible, toggleColorForm } = useStore()

  const mutation = useMutation({
    mutationFn: (colorName) =>
      fetch('/color', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: colorName })
      }),
    onSuccess: () => toggleColorForm()
  })

  const link = (
    <a href='#' onClick={e => { e.preventDefault(); toggleColorForm() }}>Add uh kuhluh</a>
  )

  const form = (
    <p>
      New kuhluh: {' '}
      <input type='text' ref={inputRef} /> {' '}
      <button onClick={() => mutation.mutate(inputRef.current.value)}>Add</button>
    </p>
  )

  return (
    <div className='add-color'>
      {mutation.isPending ? null : (isColorFormVisible ? form : link)}
    </div>
  )
}

export default AddColor