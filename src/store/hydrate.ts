import { audioService } from '../services/audioService';
import { shortService } from '../services/shortService';
import { sourceService } from '../services/sourceService';
import { transcriptService } from '../services/transcriptService';
import { videoService } from '../services/videoService';
import { writingService } from '../services/writingService';
import { useWorkspaceStore } from '../store/workspaceStore';

export async function hydrateWorkspace(projectId: string): Promise<void> {
  const store = useWorkspaceStore.getState();
  store.setHydrating(true);
  try {
    const [sources, videos, transcripts, shorts, audio, writing] = await Promise.all([
      sourceService.list(projectId),
      videoService.list(projectId),
      transcriptService.list(projectId),
      shortService.list(projectId),
      audioService.list(projectId),
      writingService.list(projectId),
    ]);
    const postLists = await Promise.all(writing.map((w) => writingService.listPosts(w.id)));
    store.setSources(sources);
    store.setVideos(videos);
    store.setTranscripts(transcripts);
    store.setShorts(shorts);
    store.setAudio(audio);
    store.setWriting(writing);
    store.setPosts(postLists.flat());
  } finally {
    store.setHydrating(false);
  }
}
