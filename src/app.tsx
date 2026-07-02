import MusicPlayer from "@/components/player";
import { PageTransition } from "@/components/page-transition";

export default function App() {
  return (
    <PageTransition>
      <MusicPlayer />
    </PageTransition>
  );
}
