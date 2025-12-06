import { redirect } from "next/navigation";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp || {})) {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else if (typeof value === "string") {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  redirect(`/dashboard/profile${qs ? `?${qs}` : ""}`);
}
