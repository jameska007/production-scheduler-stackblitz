
import React from 'react'
const Ctx = React.createContext(null)
export function Dialog({ children }){
  const [open, setOpen] = React.useState(false)
  return <Ctx.Provider value={{open,setOpen}}>{children}</Ctx.Provider>
}
export function DialogTrigger({ asChild=false, children }){
  const { setOpen } = React.useContext(Ctx)
  const child = React.Children.only(children)
  const onClick = (e)=>{
    child.props.onClick && child.props.onClick(e)
    setOpen(true)
  }
  return React.cloneElement(child, { onClick })
}
export function DialogContent({ children }){
  const { open, setOpen } = React.useContext(Ctx)
  if(!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={()=>setOpen(false)} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white border shadow-lg p-4">{children}</div>
    </div>
  )
}
export function DialogHeader({ className='', ...props }){ return <div className={`mb-2 ${className}`} {...props} /> }
export function DialogFooter({ className='', ...props }){ return <div className={`mt-2 flex justify-end gap-2 ${className}`} {...props} /> }
export function DialogTitle({ className='', ...props }){ return <div className={`text-base font-semibold ${className}`} {...props} /> }
export default Dialog
