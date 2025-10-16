
import React from 'react'
export function Tabs({ defaultValue, children }){
  const [val, setVal] = React.useState(defaultValue)
  return <div data-tabs value={val} onChange={setVal}>{children}</div>
}
export function TabsList({ className='', ...props }){ return <div className={`flex gap-2 ${className}`} {...props} /> }
export function TabsTrigger({ value, children }){ return <button className="px-3 py-1 rounded-xl border text-sm" onClick={()=>{}}>{children}</button> }
export function TabsContent({ value, children }){ return <div>{children}</div> }
export default Tabs
