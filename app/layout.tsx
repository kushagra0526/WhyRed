export const metadata = {
  title: "WhyRed",
  description:
    "Find out in 10 seconds if a CI failure is your fault, a flaky test, or already broken on main.",
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