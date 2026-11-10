import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthConfigured } from "@/lib/env";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const configured = isAuthConfigured();
  if (configured && (await getServerSession())) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use your provided email and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm configured={configured} />
        </CardContent>
      </Card>
    </main>
  );
}
