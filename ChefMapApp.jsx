export const metadata = {
  title: "ChefMap",
  description: "El mapa gastronómico recomendado por quienes conocen la cocina desde dentro",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: "#0F0D0B", minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
