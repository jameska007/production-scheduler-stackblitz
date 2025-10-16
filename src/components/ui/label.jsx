
import React from 'react'
export function Label({ className='', ...props }){
  return <label className={`text-xs font-medium ${className}`} {...props} />
}
export default Label
