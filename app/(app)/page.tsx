import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Protected application shell</CardTitle>
          <CardDescription>Next.js frontend foundation</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The dashboard and backend data connection will be implemented in later phases.
        </CardContent>
      </Card>
    </main>
  );
}
