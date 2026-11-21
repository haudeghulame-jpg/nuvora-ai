import { AuthProvider } from "../../../components/account/auth-provider";

// Only the account, sign-in, subscription and admin pages load Firebase. The
// home page does not, so it stays light.
export default function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthProvider>
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 p-6">
        {children}
      </main>
    </AuthProvider>
  );
}
