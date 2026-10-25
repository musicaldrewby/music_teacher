import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Prism Motion Studio · Drew Wichman',description:'A creative workshop for dimensional type, objects, materials, and motion.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
