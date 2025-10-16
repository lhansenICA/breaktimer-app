import { Toaster } from "@/components/ui/sonner";
import Break from "./break";
import History from "./history";
import Settings from "./settings";
import Sounds from "./sounds";

export default function Main() {
  const params = new URLSearchParams(location.search);
  const page = params.get("page");

  return (
    <>
      {page === "settings" && <Settings />}
      {page === "sounds" && <Sounds />}
      {page === "break" && <Break />}
      {page === "history" && <History />}
      <Toaster />
    </>
  );
}
