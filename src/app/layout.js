import "./globals.css";

export const metadata = {
  title: "CobroKits",
  description: "Inventario, ventas a credito y recaudo semanal",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
