import { create } from 'zustand';
import type {
  AudioGeneration,
  Job,
  Short,
  SocialPost,
  Source,
  Transcript,
  Video,
  Voice,
  WritingOutput,
} from '../types';

interface WorkspaceState {
  sources: Source[];
  videos: Video[];
  transcripts: Transcript[];
  shorts: Short[];
  audio: AudioGeneration[];
  writing: WritingOutput[];
  posts: SocialPost[];
  voices: Voice[];
  activeJob: Job | null;
  hydrating: boolean;
  setHydrating: (hydrating: boolean) => void;
  setSources: (sources: Source[]) => void;
  addSource: (source: Source) => void;
  updateSource: (source: Source) => void;
  removeSource: (id: string) => void;
  setVideos: (videos: Video[]) => void;
  addVideo: (video: Video) => void;
  setTranscripts: (transcripts: Transcript[]) => void;
  setShorts: (shorts: Short[]) => void;
  addShorts: (shorts: Short[]) => void;
  setAudio: (audio: AudioGeneration[]) => void;
  addAudio: (item: AudioGeneration) => void;
  updateAudio: (item: AudioGeneration) => void;
  setWriting: (writing: WritingOutput[]) => void;
  addWriting: (item: WritingOutput) => void;
  updateWriting: (item: WritingOutput) => void;
  setPosts: (posts: SocialPost[]) => void;
  updatePost: (post: SocialPost) => void;
  setVoices: (voices: Voice[]) => void;
  addVoice: (voice: Voice) => void;
  setActiveJob: (job: Job | null) => void;
  reset: () => void;
}

const empty = {
  sources: [] as Source[],
  videos: [] as Video[],
  transcripts: [] as Transcript[],
  shorts: [] as Short[],
  audio: [] as AudioGeneration[],
  writing: [] as WritingOutput[],
  posts: [] as SocialPost[],
  voices: [] as Voice[],
  activeJob: null as Job | null,
  hydrating: false,
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  ...empty,
  setHydrating: (hydrating) => set({ hydrating }),
  setSources: (sources) => set({ sources }),
  addSource: (source) => set((s) => ({ sources: [source, ...s.sources] })),
  updateSource: (source) =>
    set((s) => ({ sources: s.sources.map((x) => (x.id === source.id ? source : x)) })),
  removeSource: (id) => set((s) => ({ sources: s.sources.filter((x) => x.id !== id) })),
  setVideos: (videos) => set({ videos }),
  addVideo: (video) => set((s) => ({ videos: [video, ...s.videos] })),
  setTranscripts: (transcripts) => set({ transcripts }),
  setShorts: (shorts) => set({ shorts }),
  addShorts: (shorts) => set((s) => ({ shorts: [...shorts, ...s.shorts] })),
  setAudio: (audio) => set({ audio }),
  addAudio: (item) => set((s) => ({ audio: [item, ...s.audio] })),
  updateAudio: (item) =>
    set((s) => ({ audio: s.audio.map((x) => (x.id === item.id ? item : x)) })),
  setWriting: (writing) => set({ writing }),
  addWriting: (item) => set((s) => ({ writing: [item, ...s.writing] })),
  updateWriting: (item) =>
    set((s) => ({ writing: s.writing.map((x) => (x.id === item.id ? item : x)) })),
  setPosts: (posts) => set({ posts }),
  updatePost: (post) =>
    set((s) => ({ posts: s.posts.map((x) => (x.id === post.id ? post : x)) })),
  setVoices: (voices) => set({ voices }),
  addVoice: (voice) => set((s) => ({ voices: [voice, ...s.voices] })),
  setActiveJob: (activeJob) => set({ activeJob }),
  reset: () => set(empty),
}));
