import { notFound } from "next/navigation";
import { HomePage } from "@/components/home-page";

export default function DevelopmentHomePage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return <HomePage />;
}
