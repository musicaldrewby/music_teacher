import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Living Background Engine · Drew Wichman',description:'An agent-operated studio for atmospheric scenes, directional motion, living light, and cinematic loops.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
