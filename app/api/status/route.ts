import { proxyBackendRequest } from "@/lib/backend";

export async function GET() {
  return proxyBackendRequest("/status");
}
