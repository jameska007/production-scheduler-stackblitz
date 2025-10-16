
import React from 'react'
export function Button({ className='', variant='default', ...props }){
  const base = 'inline-flex items-center justify-center rounded-2xl px-3 py-2 text-sm shadow-sm border'
  const variants = {
    default: 'bg-white hover:bg-gray-50',
    secondary: 'bg-gray-100 hover:bg-gray-200',
    outline: 'bg-transparent',
  }
  return <button className={`${base} ${variants[variant]||''} ${className}`} {...props} />
}
export default Button
