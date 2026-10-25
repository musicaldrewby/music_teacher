import type {Metadata} from "next";
export const metadata:Metadata={title:"Felt & Fable Studio",description:"Create animated felt stories with Drew Wichman’s storytelling studio."};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
