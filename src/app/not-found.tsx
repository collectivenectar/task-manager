export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";

export default function NotFound() {
  redirect("/sign-in");
  return <div></div>;
}