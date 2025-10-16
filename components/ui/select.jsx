
import React from 'react'
export function Select({ value, onValueChange, children }){
  return <div data-select-value={value} data-onchange onChange={()=>{}}>{children({value, onValueChange})}</div>
}
export function SelectTrigger({ children, ...props }){ return <div {...props}>{children}</div> }
export function SelectValue({ placeholder }){ return <span className="text-sm opacity-70">{placeholder}</span> }
export function SelectContent({ children }){ return <div className="border rounded-xl p-2 bg-white">{children}</div> }
export function SelectItem({ value, children, onSelect }){
  return <div className="px-2 py-1 rounded hover:bg-gray-100 cursor-pointer" onClick={()=>onSelect && onSelect(value)}>{children}</div>
}
// Helper hook-ish component for native select fallback used in our app
export function NativeSelect({ value, onChange, children }){
  return <select className="w-full rounded-xl border px-3 py-2 text-sm" value={value} onChange={e=>onChange(e.target.value)}>{children}</select>
}
export default Select
