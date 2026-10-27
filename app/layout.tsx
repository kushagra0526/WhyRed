import "./globals.css";

export const tagline =
  "CI failed? Find out in 10 seconds if it's your fault, a flaky test, or already broken on main.";

export const metadata = {
  title: "WhyRed",
  description: tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}